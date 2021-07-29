import {
    CreateSavedQuery,
    CreateSavedQueryVersion,
    SavedQuery,
    Space,
} from 'common';
import {
    addSavedQueryVersion,
    createSavedQuery,
    getSavedQueryByUuid,
} from '../database/entities/savedQueries';
import database from '../database/database';
import { getSpaceWithQueries } from '../database/entities/spaces';

export const SavedQueriesModel = {
    getAllSpaces: async (): Promise<Space[]> => {
        const space = await getSpaceWithQueries();
        return [space];
    },
    create: async (savedQuery: CreateSavedQuery): Promise<SavedQuery> =>
        createSavedQuery(savedQuery),
    getById: async (savedQueryUuid: string): Promise<SavedQuery> =>
        getSavedQueryByUuid(database, savedQueryUuid),

    addVersion: async (
        savedQueryUuid: string,
        data: CreateSavedQueryVersion,
    ): Promise<SavedQuery> => addSavedQueryVersion(savedQueryUuid, data),
};
