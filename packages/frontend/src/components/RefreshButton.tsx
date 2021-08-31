import { Button } from '@blueprintjs/core';
import React from 'react';
import { UseQueryResult } from 'react-query';
import { ApiError, ApiQueryResults } from 'common';
import { useExplorer } from '../providers/ExplorerProvider';
import { useTracking } from '../providers/TrackingProvider';
import { EventName } from '../types/Events';
import { useQueryResults } from '../hooks/useQueryResults';

type RefreshButtonProps = {
    queryResults: UseQueryResult<ApiQueryResults, ApiError>;
};
export const RefreshButton = () => {
    const {
        state: { isValidQuery },
    } = useExplorer();
    const queryResults = useQueryResults(false);
    const { refetch, isFetching } = queryResults;
    const { track } = useTracking();
    return (
        <Button
            intent="primary"
            style={{ height: '40px', width: 150, marginRight: '10px' }}
            onClick={() => {
                refetch();
                track({
                    name: EventName.RUN_QUERY_BUTTON_CLICKED,
                });
            }}
            disabled={!isValidQuery}
            loading={isFetching}
        >
            Run query
        </Button>
    );
};
