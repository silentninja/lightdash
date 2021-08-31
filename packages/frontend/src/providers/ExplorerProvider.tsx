import React, {
    FC,
    useContext,
    createContext,
    useReducer,
    useMemo,
    useCallback,
    useEffect,
} from 'react';
import { FieldId, FilterGroup, SortField } from 'common';

export enum ActionType {
    RESET,
    SET_STATE,
    SET_TABLE_NAME,
    TOGGLE_DIMENSION,
    TOGGLE_METRIC,
    TOGGLE_SORT_FIELD,
    SET_SORT_FIELDS,
    SET_ROW_LIMIT,
    SET_FILTERS,
    SET_COLUMN_ORDER,
}

type Action =
    | { type: ActionType.RESET }
    | { type: ActionType.SET_STATE; payload: Required<ExplorerReduceState> }
    | { type: ActionType.SET_TABLE_NAME; payload: string }
    | {
          type:
              | ActionType.TOGGLE_DIMENSION
              | ActionType.TOGGLE_METRIC
              | ActionType.TOGGLE_SORT_FIELD;
          payload: FieldId;
      }
    | {
          type: ActionType.SET_SORT_FIELDS;
          payload: SortField[];
      }
    | {
          type: ActionType.SET_ROW_LIMIT;
          payload: number;
      }
    | {
          type: ActionType.SET_FILTERS;
          payload: FilterGroup[];
      }
    | {
          type: ActionType.SET_COLUMN_ORDER;
          payload: string[];
      };
export enum DiffType {
    Added,
    Deleted,
    Modified,
    Pristine,
}

export type DiffState = { [key: string]: DiffType };

interface ExplorerReduceState {
    tableName: string | undefined;
    dimensions: FieldId[];
    metrics: FieldId[];
    filters: FilterGroup[];
    sorts: SortField[];
    columnOrder: string[];
    limit: number;
}

interface ExplorerState extends ExplorerReduceState {
    activeFields: Set<FieldId>;
    isValidQuery: boolean;
}

interface ExplorerContext {
    state: ExplorerState;
    pristineState: ExplorerState;
    actions: {
        reset: () => void;
        syncState: () => void;
        setState: (state: Required<ExplorerReduceState>) => void;
        setTableName: (tableName: string) => void;
        toggleActiveField: (fieldId: FieldId, isDimension: boolean) => void;
        toggleSortField: (fieldId: FieldId) => void;
        setSortFields: (sortFields: SortField[]) => void;
        setRowLimit: (limit: number) => void;
        setFilters: (filters: FilterGroup[]) => void;
        setColumnOrder: (order: string[]) => void;
        getFieldStatus: (fieldId: FieldId) => DiffType;
    };
}

const toggleArrayValue = (initialArray: string[], value: string): string[] => {
    const array = [...initialArray];
    const index = array.indexOf(value);
    if (index === -1) {
        array.push(value);
    } else {
        array.splice(index, 1);
    }
    return array;
};

const Context = createContext<ExplorerContext>(undefined as any);

const defaultState: ExplorerReduceState = {
    tableName: undefined,
    dimensions: [],
    metrics: [],
    filters: [],
    sorts: [],
    columnOrder: [],
    limit: 500,
};

const calcColumnOrder = (
    columnOrder: FieldId[],
    fieldIds: FieldId[],
): FieldId[] => {
    const cleanColumnOrder = columnOrder.filter((column) =>
        fieldIds.includes(column),
    );
    const missingColumns = fieldIds.filter(
        (fieldId) => !cleanColumnOrder.includes(fieldId),
    );
    return [...cleanColumnOrder, ...missingColumns];
};

const differ = (pristine: any[], dirty: any[]): DiffState => {
    const added = dirty
        .filter((value) => !pristine.includes(value))
        .reduce(
            (accumulator, value) => ({
                ...accumulator,
                [value]: DiffType.Added,
            }),
            {},
        );
    const deleted = pristine
        .filter((value) => !dirty.includes(value))
        .reduce(
            (accumulator, value) => ({
                ...accumulator,
                [value]: DiffType.Deleted,
            }),
            {},
        );
    return { ...added, ...deleted };
};

function pristineReducer(
    state: ExplorerReduceState,
    action: Action,
): ExplorerReduceState {
    switch (action.type) {
        case ActionType.RESET: {
            return defaultState;
        }
        case ActionType.SET_STATE: {
            return {
                ...action.payload,
                columnOrder: calcColumnOrder(action.payload.columnOrder, [
                    ...action.payload.dimensions,
                    ...action.payload.metrics,
                ]),
            };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

function reducer(
    state: ExplorerReduceState,
    action: Action,
): ExplorerReduceState {
    switch (action.type) {
        case ActionType.RESET: {
            return defaultState;
        }
        case ActionType.SET_STATE: {
            return {
                ...action.payload,
                columnOrder: calcColumnOrder(action.payload.columnOrder, [
                    ...action.payload.dimensions,
                    ...action.payload.metrics,
                ]),
            };
        }
        case ActionType.SET_TABLE_NAME: {
            return { ...state, tableName: action.payload };
        }
        case ActionType.TOGGLE_DIMENSION: {
            const dimensions = toggleArrayValue(
                state.dimensions,
                action.payload,
            );
            return {
                ...state,
                dimensions,
                sorts: state.sorts.filter((s) => s.fieldId !== action.payload),
                columnOrder: calcColumnOrder(state.columnOrder, [
                    ...dimensions,
                    ...state.metrics,
                ]),
            };
        }
        case ActionType.TOGGLE_METRIC: {
            const metrics = toggleArrayValue(state.metrics, action.payload);
            return {
                ...state,
                metrics,
                sorts: state.sorts.filter((s) => s.fieldId !== action.payload),
                columnOrder: calcColumnOrder(state.columnOrder, [
                    ...state.dimensions,
                    ...metrics,
                ]),
            };
        }
        case ActionType.TOGGLE_SORT_FIELD: {
            const sortFieldId = action.payload;
            const activeFields = new Set([
                ...state.dimensions,
                ...state.metrics,
            ]);
            if (!activeFields.has(sortFieldId)) {
                return state;
            }
            const sortField = state.sorts.find(
                (sf) => sf.fieldId === sortFieldId,
            );
            return {
                ...state,
                sorts: !sortField
                    ? [
                          ...state.sorts,
                          {
                              fieldId: sortFieldId,
                              descending: false,
                          },
                      ]
                    : state.sorts.reduce<SortField[]>((acc, sf) => {
                          if (sf.fieldId !== sortFieldId) {
                              return [...acc, sf];
                          }

                          if (sf.descending) {
                              return acc;
                          }
                          return [
                              ...acc,
                              {
                                  ...sf,
                                  descending: true,
                              },
                          ];
                      }, []),
            } as ExplorerReduceState;
        }
        case ActionType.SET_SORT_FIELDS: {
            const activeFields = new Set([
                ...state.dimensions,
                ...state.metrics,
            ]);
            return {
                ...state,
                sorts: action.payload.filter((sf) =>
                    activeFields.has(sf.fieldId),
                ),
            };
        }
        case ActionType.SET_ROW_LIMIT: {
            return {
                ...state,
                limit: action.payload,
            };
        }
        case ActionType.SET_FILTERS: {
            return {
                ...state,
                filters: action.payload,
            };
        }
        case ActionType.SET_COLUMN_ORDER: {
            return {
                ...state,
                columnOrder: calcColumnOrder(action.payload, [
                    ...state.dimensions,
                    ...state.metrics,
                ]),
            };
        }
        default: {
            throw new Error(`Unhandled action type`);
        }
    }
}

export const ExplorerProvider: FC = ({ children }) => {
    const [reducerState, dispatch] = useReducer(reducer, defaultState);
    const [pristineReducerState, pristineDispatch] = useReducer(
        pristineReducer,
        defaultState,
    );

    const [activeFields, isValidQuery] = useMemo<
        [Set<FieldId>, boolean]
    >(() => {
        const fields = new Set([
            ...reducerState.dimensions,
            ...reducerState.metrics,
        ]);
        return [fields, fields.size > 0];
    }, [reducerState]);
    const [pristineActiveFields, pristineIsValidQuery] = useMemo<
        [Set<FieldId>, boolean]
    >(() => {
        const fields = new Set([
            ...pristineReducerState.dimensions,
            ...pristineReducerState.metrics,
        ]);
        return [fields, fields.size > 0];
    }, [pristineReducerState]);
    const activeFieldsDiff = useMemo<DiffState>(
        () => differ([...pristineActiveFields], [...activeFields]),
        [activeFields, pristineActiveFields],
    );
    const getFieldStatus = useCallback(
        (fieldId: FieldId) => activeFieldsDiff[fieldId] ?? DiffType.Pristine,
        [activeFieldsDiff],
    );

    const reset = useCallback(() => {
        dispatch({
            type: ActionType.RESET,
        });
    }, []);
    const syncState = useCallback(() => {
        pristineDispatch({
            type: ActionType.SET_STATE,
            payload: reducerState,
        });
    }, [reducerState]);

    const setState = useCallback((state: ExplorerReduceState) => {
        pristineDispatch({
            type: ActionType.SET_STATE,
            payload: state,
        });
        dispatch({
            type: ActionType.SET_STATE,
            payload: state,
        });
    }, []);

    const setTableName = useCallback((tableName: string) => {
        dispatch({
            type: ActionType.SET_TABLE_NAME,
            payload: tableName,
        });
    }, []);
    const toggleActiveField = useCallback(
        (fieldId: FieldId, isDimension: boolean) => {
            dispatch({
                type: isDimension
                    ? ActionType.TOGGLE_DIMENSION
                    : ActionType.TOGGLE_METRIC,
                payload: fieldId,
            });
        },
        [],
    );
    const toggleSortField = useCallback((fieldId: FieldId) => {
        dispatch({
            type: ActionType.TOGGLE_SORT_FIELD,
            payload: fieldId,
        });
    }, []);

    const setSortFields = useCallback((sortFields: SortField[]) => {
        dispatch({
            type: ActionType.SET_SORT_FIELDS,
            payload: sortFields,
        });
    }, []);

    const setRowLimit = useCallback((limit: number) => {
        dispatch({
            type: ActionType.SET_ROW_LIMIT,
            payload: limit,
        });
    }, []);

    const setFilters = useCallback((filters: FilterGroup[]) => {
        dispatch({
            type: ActionType.SET_FILTERS,
            payload: filters,
        });
    }, []);

    const setColumnOrder = useCallback((order: string[]) => {
        dispatch({
            type: ActionType.SET_COLUMN_ORDER,
            payload: order,
        });
    }, []);

    const value: ExplorerContext = {
        state: useMemo(
            () => ({ ...reducerState, activeFields, isValidQuery }),
            [reducerState, activeFields, isValidQuery],
        ),
        pristineState: useMemo(
            () => ({ ...pristineReducerState, activeFields, isValidQuery }),
            [activeFields, isValidQuery, pristineReducerState],
        ),
        actions: useMemo(
            () => ({
                reset,
                syncState,
                setState,
                setTableName,
                toggleActiveField,
                toggleSortField,
                setSortFields,
                setFilters,
                setRowLimit,
                setColumnOrder,
                getFieldStatus,
            }),
            [
                reset,
                syncState,
                setFilters,
                setRowLimit,
                setSortFields,
                setState,
                setTableName,
                toggleActiveField,
                toggleSortField,
                setColumnOrder,
                getFieldStatus,
            ],
        ),
    };
    return <Context.Provider value={value}>{children}</Context.Provider>;
};

export function useExplorer(): ExplorerContext {
    const context = useContext(Context);
    if (context === undefined) {
        throw new Error('useExplorer must be used within a ExplorerProvider');
    }
    return context;
}
