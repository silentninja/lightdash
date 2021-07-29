import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('projects', (table) => {
        table.increments('project_id');
        table
            .uuid('project_uuid')
            .notNullable()
            .defaultTo(knex.raw('uuid_generate_v4()'));
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.text('name').notNullable();
        table
            .integer('organization_id')
            .notNullable()
            .references('organization_id')
            .inTable('organizations')
            .onDelete('CASCADE');
    });

    await knex.schema.createTable('spaces', (table) => {
        table.increments('space_id');
        table
            .uuid('space_uuid')
            .notNullable()
            .defaultTo(knex.raw('uuid_generate_v4()'));
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.text('name').notNullable();
        table
            .integer('project_id')
            .notNullable()
            .references('project_id')
            .inTable('projects')
            .onDelete('CASCADE');
    });

    await knex.schema.createTable('saved_queries', (table) => {
        table.increments('saved_query_id');
        table
            .uuid('saved_query_uuid')
            .notNullable()
            .defaultTo(knex.raw('uuid_generate_v4()'));
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.text('name').notNullable();
        table
            .integer('space_id')
            .notNullable()
            .references('space_id')
            .inTable('spaces')
            .onDelete('CASCADE');
    });

    await knex.schema.createTable('saved_queries_versions', (table) => {
        table.increments('saved_queries_version_id');
        table
            .uuid('saved_queries_version_uuid')
            .notNullable()
            .defaultTo(knex.raw('uuid_generate_v4()'));
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.text('explore_name').notNullable();
        table.jsonb('filters').notNullable();
        table.integer('row_limit').notNullable();
        table
            .integer('saved_query_id')
            .notNullable()
            .references('saved_query_id')
            .inTable('saved_queries')
            .onDelete('CASCADE');
    });

    await knex.schema.createTable('saved_queries_version_fields', (table) => {
        table.increments('saved_queries_version_field_id');
        table.text('name').notNullable();
        table.boolean('isDimension').notNullable();
        table
            .integer('saved_queries_version_id')
            .notNullable()
            .references('saved_queries_version_id')
            .inTable('saved_queries_versions')
            .onDelete('CASCADE');
    });

    await knex.schema.createTable('saved_queries_version_sorts', (table) => {
        table.increments('saved_queries_version_sort_id');
        table.text('field_name').notNullable();
        table.boolean('descending').notNullable();
        table
            .integer('saved_queries_version_id')
            .notNullable()
            .references('saved_queries_version_id')
            .inTable('saved_queries_versions')
            .onDelete('CASCADE');
    });

    const orgs = await knex('organizations')
        .select(['organization_id', 'organization_name'])
        .limit(1);

    if (orgs.length > 0) {
        const project = (
            await knex('projects')
                .insert({
                    name: orgs[0].organization_name,
                    organization_id: orgs[0].organization_id,
                })
                .returning('*')
        )[0];

        await knex('spaces')
            .insert({
                name: orgs[0].organization_name,
                project_id: project.project_id,
            })
            .returning('*');
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('saved_queries_version_sorts');
    await knex.schema.dropTableIfExists('saved_queries_version_fields');
    await knex.schema.dropTableIfExists('saved_queries_versions');
    await knex.schema.dropTableIfExists('saved_queries');
    await knex.schema.dropTableIfExists('spaces');
    await knex.schema.dropTableIfExists('projects');
}
