import { Knex } from 'knex';
import * as crypto from 'crypto';
import { InviteLink } from 'common/dist/models/InviteLink';
import { NotExistsError } from '../errors';

export class InviteLinkModel {
    private database: Knex;

    constructor(database: Knex) {
        this.database = database;
    }

    async create(
        inviteCode: string,
        expiresAt: Date,
        organizationUuid: string,
    ) {
        const inviteCodeHash = InviteLinkModel._hash(inviteCode);
        const orgs = await this.database('organizations')
            .where('organization_uuid', organizationUuid)
            .select('*');
        if (orgs.length === 0) {
            throw new NotExistsError('Cannot find organization');
        }
        const org = orgs[0];
        await this.database('invite_links').insert({
            organization_id: org.organization_id,
            invite_code_hash: inviteCodeHash,
            expires_at: expiresAt,
        });
    }
}
