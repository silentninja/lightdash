import { Knex } from 'knex';
import {
    CreateSavedQuery,
    CreateSavedQueryVersion,
    SavedQuery,
    SortField,
} from 'common';
import database from '../database';
import { getSpace } from './spaces';
import { NotFoundError } from '../../errors';

type DbSavedQueryDetails = {
    saved_query_id: number;
    saved_query_uuid: string;
    name: string;
    saved_queries_version_id: number;
    explore_name: string;
    filters: any;
    row_limit: number;
};

type DbSavedQuery = {
    saved_query_id: number;
    saved_query_uuid: string;
    space_id: number;
    name: string;
    created_at: Date;
};

type DbSavedQueryVersion = {
    saved_queries_version_id: number;
    saved_queries_version_uuid: string;
    explore_name: string;
    row_limit: number;
    filters: any;
    created_at: Date;
    saved_query_id: number;
};

type CreateDbSavedQueryVersion = Pick<
    DbSavedQueryVersion,
    'saved_query_id' | 'explore_name' | 'filters' | 'row_limit'
> & {};

type DbSavedQueryVersionField = {
    saved_queries_version_field_id: number;
    saved_queries_version_id: number;
    name: string;
    isDimension: boolean;
};

type CreateDbSavedQueryVersionField = Pick<
    DbSavedQueryVersionField,
    'saved_queries_version_id' | 'name' | 'isDimension'
>;

type DbSavedQueryVersionSort = {
    saved_queries_version_sort_id: number;
    saved_queries_version_id: number;
    field_name: string;
    descending: boolean;
};

type CreateDbSavedQueryVersionSort = Pick<
    DbSavedQueryVersionSort,
    'saved_queries_version_id' | 'field_name' | 'descending'
>;

export const getSavedQueryByUuid = async (
    db: Knex,
    savedQueryUuid: string,
): Promise<SavedQuery> => {
    const results = await db<DbSavedQueryDetails>('saved_queries')
        .leftJoin(
            'saved_queries_versions',
            'saved_queries.saved_query_id',
            'saved_queries_versions.saved_query_id',
        )
        .leftJoin(
            'saved_queries_version_sorts',
            'saved_queries_version_sorts.saved_queries_version_id',
            'saved_queries_versions.saved_queries_version_id',
        )
        .leftJoin(
            'saved_queries_version_fields',
            'saved_queries_version_fields.saved_queries_version_id',
            'saved_queries_versions.saved_queries_version_id',
        )
        .select<DbSavedQueryDetails[]>([
            'saved_queries.saved_query_id',
            'saved_queries.saved_query_uuid',
            'saved_queries.name',
            'saved_queries_versions.saved_queries_version_id',
            'saved_queries_versions.explore_name',
            'saved_queries_versions.filters',
            'saved_queries_versions.row_limit',
        ])
        .where('saved_query_uuid', savedQueryUuid)
        .orderBy('saved_queries_versions.created_at', 'desc')
        .limit(1);
    if (results.length <= 0) {
        throw new NotFoundError('Saved query not found');
    }
    const savedQuery = results[0];
    const fields = await db<DbSavedQueryVersionField>(
        'saved_queries_version_fields',
    )
        .select<DbSavedQueryVersionField[]>(['name', 'isDimension'])
        .where('saved_queries_version_id', savedQuery.saved_queries_version_id);
    const sorts = await db<DbSavedQueryVersionSort>(
        'saved_queries_version_sorts',
    )
        .select<DbSavedQueryVersionSort[]>(['field_name', 'descending'])
        .where('saved_queries_version_id', savedQuery.saved_queries_version_id);

    const [dimensions, metrics]: [string[], string[]] = fields.reduce<
        [string[], string[]]
    >(
        (result, field) => {
            result[field.isDimension ? 0 : 1].push(field.name);
            return result;
        },
        [[], []],
    );

    return {
        uuid: savedQuery.saved_query_uuid,
        name: savedQuery.name,
        tableName: savedQuery.explore_name,
        metricQuery: {
            dimensions,
            metrics,
            filters: savedQuery.filters,
            sorts: sorts.map<SortField>((sort) => ({
                fieldId: sort.field_name,
                descending: sort.descending,
            })),
            limit: savedQuery.row_limit,
        },
        chartConfig: {},
    };
};

const createSavedQueryVersionField = async (
    db: Knex,
    data: CreateDbSavedQueryVersionField,
): Promise<DbSavedQueryVersionField> => {
    const results = await db<DbSavedQueryVersionField>(
        'saved_queries_version_fields',
    )
        .insert<CreateDbSavedQueryVersionField>(data)
        .returning('*');
    return results[0];
};

const createSavedQueryVersionSort = async (
    db: Knex,
    data: CreateDbSavedQueryVersionSort,
): Promise<DbSavedQueryVersionSort> => {
    const results = await db<DbSavedQueryVersionSort>(
        'saved_queries_version_fields',
    )
        .insert<CreateDbSavedQueryVersionSort>(data)
        .returning('*');
    return results[0];
};

export const createSavedQueryVersion = async (
    db: Knex,
    savedQueryId: number,
    {
        tableName,
        metricQuery: { limit, filters, dimensions, metrics, sorts },
    }: CreateSavedQueryVersion,
): Promise<void> => {
    await db.transaction(async (trx) => {
        try {
            const results = await trx<DbSavedQueryVersion>(
                'saved_queries_versions',
            )
                .insert<CreateDbSavedQueryVersion>({
                    row_limit: limit,
                    filters: JSON.stringify(filters),
                    explore_name: tableName,
                    saved_query_id: savedQueryId,
                })
                .returning('*');
            const version = results[0];

            const promises: Promise<any>[] = [];
            for (let index = 0; index < dimensions.length; index += 1) {
                promises.push(
                    createSavedQueryVersionField(trx, {
                        name: dimensions[index],
                        isDimension: true,
                        saved_queries_version_id:
                            version.saved_queries_version_id,
                    }),
                );
            }
            for (let index = 0; index < metrics.length; index += 1) {
                promises.push(
                    createSavedQueryVersionField(trx, {
                        name: metrics[index],
                        isDimension: false,
                        saved_queries_version_id:
                            version.saved_queries_version_id,
                    }),
                );
            }
            for (let index = 0; index < sorts.length; index += 1) {
                promises.push(
                    createSavedQueryVersionSort(trx, {
                        field_name: sorts[index].fieldId,
                        descending: sorts[index].descending,
                        saved_queries_version_id:
                            version.saved_queries_version_id,
                    }),
                );
            }

            await Promise.all(promises);
        } catch (e) {
            await trx.rollback(e);
            throw e;
        }
    });
};

export const createSavedQuery = async ({
    name,
    tableName,
    metricQuery,
    chartConfig,
}: CreateSavedQuery): Promise<SavedQuery> => {
    const newSavedQueryUuid = await database.transaction(async (trx) => {
        try {
            const space = await getSpace(trx);

            const results = await trx<DbSavedQuery>('saved_queries')
                .insert<Pick<DbSavedQuery, 'name'>>({
                    name,
                    space_id: space.space_id,
                })
                .returning('*');
            const newSavedQuery = results[0];

            await createSavedQueryVersion(trx, newSavedQuery.saved_query_id, {
                tableName,
                metricQuery,
                chartConfig,
            });

            return newSavedQuery.saved_query_uuid;
        } catch (e) {
            await trx.rollback(e);
            throw e;
        }
    });
    return getSavedQueryByUuid(database, newSavedQueryUuid);
};

export const addSavedQueryVersion = async (
    savedQueryUuid: string,
    data: CreateSavedQueryVersion,
): Promise<SavedQuery> => {
    await database.transaction(async (trx) => {
        try {
            const savedQuery = await database<DbSavedQuery>('saved_queries')
                .select<{ saved_query_id: number }[]>([
                    'saved_queries.saved_query_id',
                ])
                .where('saved_query_uuid', savedQueryUuid)
                .limit(1);

            await createSavedQueryVersion(
                trx,
                savedQuery[0].saved_query_id,
                data,
            );
        } catch (e) {
            await trx.rollback(e);
            throw e;
        }
    });
    return getSavedQueryByUuid(database, savedQueryUuid);
};
