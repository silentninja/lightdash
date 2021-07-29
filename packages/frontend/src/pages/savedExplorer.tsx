import React, { useEffect } from 'react';
import { Card } from '@blueprintjs/core';
import { useHistory, useParams } from 'react-router-dom';
import { rudderAnalytics } from '../components/Analytics';
import { ExplorePanel } from '../components/ExploreSideBar';
import { Explorer } from '../components/Explorer';
import { useExplorer } from '../providers/ExplorerProvider';
import AboutFooter from '../components/AboutFooter';
import { useSavedQuery } from '../hooks/useSavedQuery';

const SavedExplorer = () => {
    const history = useHistory();
    const pathParams = useParams<{ savedQueryId: string }>();
    const {
        actions: { setState, reset },
    } = useExplorer();
    const { data } = useSavedQuery({ id: pathParams.savedQueryId });

    const onBack = () => {
        reset();
        history.push({
            pathname: `/saved`,
        });
    };

    useEffect(() => {
        rudderAnalytics.page(undefined, 'Saved');
    }, []);

    useEffect(() => {
        if (data) {
            setState({
                tableName: data.tableName,
                dimensions: data.metricQuery.dimensions,
                metrics: data.metricQuery.metrics,
                filters: data.metricQuery.filters,
                sorts: data.metricQuery.sorts,
                limit: data.metricQuery.limit,
            });
        }
    }, [data, setState]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                justifyContent: 'stretch',
                alignItems: 'flex-start',
            }}
        >
            <Card
                style={{
                    height: 'calc(100vh - 50px)',
                    width: '400px',
                    marginRight: '10px',
                    overflow: 'hidden',
                    position: 'sticky',
                    top: '50px',
                }}
                elevation={1}
            >
                <div
                    style={{
                        height: '100%',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <ExplorePanel onBack={onBack} />
                    <AboutFooter />
                </div>
            </Card>
            <div
                style={{
                    padding: '10px 10px',
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'stretch',
                }}
            >
                <Explorer savedQueryId={pathParams.savedQueryId} />
            </div>
        </div>
    );
};

export default SavedExplorer;
