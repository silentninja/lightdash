export type InviteLink = {
    expiresAt: Date;
    inviteCode: string;
};

export type CreateInviteLink = Omit<InviteLink, 'inviteCode'>;
