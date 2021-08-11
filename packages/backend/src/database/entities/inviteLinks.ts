import { Knex } from 'knex';

type DbInviteLink = {
    invite_link_id: number;
    organization_id: number;
    invite_code_hash: string;
    created_at: Date;
    expires_at: Date;
};

type DbInviteLinkInsert = Pick<
    DbInviteLink,
    'organization_id' | 'invite_code_hash' | 'expires_at'
>;
type DbInviteLinkUpdate = Partial<Omit<DbInviteLink, 'invite_link_id'>>;

export type InviteLinkTable = Knex.CompositeTableType<
    DbInviteLink,
    DbInviteLinkInsert,
    DbInviteLinkUpdate
>;
