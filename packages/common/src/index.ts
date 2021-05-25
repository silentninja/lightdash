export type Explore = {
    name: string,                           // Friendly name any characters
    baseTable: string,                      // Must match a tableName in tables
    joinedTables: ExploreJoin[],            // Must match a tableName in tables
    tables: {[tableName: string]: Table} // All tables in this explore
}

export type ExploreJoin = {
    table: string,              // Must match a tableName in containing Explore
    sqlOn: string,              // Templated sql on clause
}

export type Table = {
    name: string,                                 // Must be sql friendly (a-Z, 0-9, _)
    description?: string,                         // Optional description of table
    sqlTable: string,                             // The sql identifier for the table
    dimensions: {[fieldName: string]: Dimension}, // Field names must be unique across dims and measures
    measures: {[fieldName: string]: Measure},     //
}

// Helper function to get a list of all dimensions in an explore
export const getDimensions = (explore: Explore) => (
    Object.values(explore.tables).flatMap(t => Object.values(t.dimensions))
)

// Helper function to get a list of all measures in an explore
export const getMeasures = (explore: Explore) => (
    Object.values(explore.tables).flatMap(t => Object.values(t.measures))
)

export const getFields = (explore: Explore): Field[] => [...getDimensions(explore), ...getMeasures(explore)]

// Every dimension and measure is a field
export type Field =
    | Dimension
    | Measure

// Dimensions can have different types (UI behaviour and filter options)
export type StringDimension = {
    type: 'string'            // Discriminator field
    name: string              // Field names are unique within a table
    table: string             // Table names are unique within the project
    sql: string               // Templated sql to access this dimension in a tabl
    description?: string      // Optional description of the field
}
export type NumberDimension = {
    type: 'number'
    name: string
    table: string
    sql: string
    description?: string
}
export type TimestampDimension = {
    type: 'timestamp'
    name: string
    table: string
    sql: string
    description?: string
}
export type DateDimension = {
    type: 'date'
    name: string
    table: string
    sql: string
    description?: string
}
export type BooleanDimension = {
    type: 'boolean'
    name: string
    table: string
    sql: string
    description?: string
}

export type Dimension =
    | StringDimension
    | NumberDimension
    | TimestampDimension
    | DateDimension
    | BooleanDimension

export type DimensionType = Dimension["type"]

export const isDimension = (field: Field) => {
    const fieldType = field.type
    switch (field.type) {
        // Dimensions
        case "number": return true
        case "string": return true
        case "boolean": return true
        case "date": return true
        case "timestamp": return true

        // Measures
        case "average": return false
        case "sum": return false
        case "min": return false
        case "max": return false
        case "count_distinct": return false
        case "count": return false
        default: {
            const nope: never = field
            throw Error(`Is dimension not implemented for type ${field}`)
        }
    }
}

// Field ids are unique across the project
export type FieldId = string
export const fieldId = (field: Field): FieldId => `${field.table}_${field.name}`

// Measures
export type AverageMeasure = {
    type: 'average',
    name: string,
    table: string,
    sql: string
    description?: string
}
export type CountMeasure = {
    type: 'count',
    name: string,
    table: string,
    sql: string
    description?: string
}
export type CountDistinctMeasure = {
    type: 'count_distinct',
    name: string,
    table: string,
    sql: string
    description?: string
}
export type SumMeasure = {
    type: 'sum',
    name: string,
    table: string,
    sql: string
    description?: string
}
export type MinMeasure = {
    type: 'min',
    name: string,
    table: string,
    sql: string
    description?: string
}
export type MaxMeasure = {
    type: 'max',
    name: string,
    table: string,
    sql: string
    description?: string
}
export type Measure =
    | AverageMeasure
    | CountMeasure
    | CountDistinctMeasure
    | SumMeasure
    | MinMeasure
    | MaxMeasure

export type MeasureType = Measure["type"]

// Object used to query an explore
export type MetricQuery = {
    explore: Explore              // Queries only happen within a single explore
    dimensions: Dimension[],      // Dimensions to group by in the explore
    measures: Measure[],          // Measures to compute in the explore
    filters: FilterGroup[],       // Filters applied to the table to query (logical AND)
    sorts: SortField[],           // Sorts for the data
    limit: number,                // Max number of rows to return from query
}

// Sort by
export type SortField = {
    field: Field,                 // Field must exist in the explore
    direction: Direction,         // Direction of the sort
}

export enum Direction {
    ascending = 'ascending',
    descending = 'descending',
}

export enum FilterGroupOperator {
    and = 'and',
    or = 'or',
}

// Filter groups combine multiple filters for a single dimension or measure
// The filters in a filter group can be combined with AND/OR
// Filters vary depending on the dimension type
export type StringFilterGroup = {
    type: 'string'
    dimension: StringDimension
    operator: FilterGroupOperator
    filters: StringFilter[]
}

export type StringFilter =
    | { operator: 'equals', values: string[] }
    | { operator: 'notEquals', values: string[] }
    | { operator: 'startsWith', value: string }
    | { operator: 'isNull' }
    | { operator: 'notNull' }

export type NumberFilterGroup = {
    type: 'number'
    dimension: NumberDimension
    operator: FilterGroupOperator
    filters: NumberFilter[]
}

export type NumberFilter =
    | { operator: 'equals', values: number[] }
    | { operator: 'notEquals', values: number[] }
    | { operator: 'greaterThan', value: number }
    | { operator: 'lessThan', value: number }
    | { operator: 'isNull' }
    | { operator: 'notNull' }

export type FilterGroup =
    | StringFilterGroup
    | NumberFilterGroup

export type FilterableDimension = FilterGroup["dimension"]
export type FilterType = FilterGroup["type"]
export const assertFilterableDimension = (dimension: Dimension): FilterableDimension | undefined => {
    switch (dimension.type) {
        case "string": return dimension
        case "number": return dimension
        default:
            return undefined
    }
}
export const filterableDimensionsOnly = (dimensions: Dimension[]): FilterableDimension[] => {
    return dimensions.map(assertFilterableDimension).filter(d => d !== undefined) as FilterableDimension[]
}

// Map native database types to sensible dimension types in lightdash
// Used to autogenerate explore tables from database table schemas
export const mapColumnTypeToLightdashType = (columnType: string): DimensionType => {
    return lightdashTypeMap[columnType] || 'string'
}

const lightdashTypeMap: {[columnType: string]: DimensionType} = {
    'INTEGER':   'number',
    'INT32':     'number',
    'INT64':     'number',
    'FLOAT':     'number',
    'NUMERIC':   'number',
    'BOOLEAN':   'boolean',
    'STRING':    'string',
    'TIMESTAMP': 'timestamp',
    'DATETIME':  'string',
    'DATE':      'date',
    'TIME':      'string',
    'BOOL':      'boolean',
    'ARRAY':     'string',
    'GEOGRAPHY': 'string',
    'NUMBER': 'number',
    'DECIMAL': 'number',
    'INT': 'number',
    'BIGINT': 'number',
    'SMALLINT': 'number',
    'FLOAT4': 'number',
    'FLOAT8': 'number',
    'DOUBLE': 'number',
    'DOUBLE PRECISION': 'number',
    'REAL': 'number',
    'VARCHAR': 'string',
    'CHAR': 'string',
    'CHARACTER': 'string',
    'TEXT': 'string',
    'BINARY': 'string',
    'VARBINARY': 'string',
    'TIMESTAMP_NTZ': 'timestamp',
    'VARIANT': 'string',
    'OBJECT': 'string',
    'INT2': 'number',
    'INT4': 'number',
    'INT8': 'number',
    'NCHAR': 'string',
    'BPCHAR': 'string',
    'CHARACTER VARYING': 'string',
    'NVARCHAR': 'string',
    'TIMESTAMP WITHOUT TIME ZONE': 'timestamp',
    'GEOMETRY': 'string',
    'TIME WITHOUT TIME ZONE': 'string',
    'XML': 'string',
    'UUID': 'string',
    'PG_LSN': 'string',
    'MACADDR': 'string',
    'JSON': 'string',
    'JSONB': 'string',
    'CIDR': 'string',
    'INET': 'string',
    'MONEY': 'number',
    'SMALLSERIAL': 'number',
    'SERIAL2': 'number',
    'SERIAL': 'number',
    'SERIAL4': 'number',
    'BIGSERIAL': 'number',
    'SERIAL8': 'number',
}

// THESE ALL GET DEFAULT CONVERTED TO STRINGS (SO NO SPECIAL TREATMENT)
// # TIMETZ not supported
// # TIME WITH TIME ZONE not supported
// # TIMESTAMP_LTZ not supported (see https://docs.looker.com/reference/field-params/dimension_group)
//     # TIMESTAMP_TZ not supported (see https://docs.looker.com/reference/field-params/dimension_group)
//     # HLLSKETCH not supported
// # TIMESTAMPTZ not supported
// # TIMESTAMP WITH TIME ZONE not supported
// # BIT, BIT VARYING, VARBIT not supported
// # BOX not supported
// # BYTEA not supported
// # CIRCLE not supported
// # INTERVAL not supported
// # LINE not supported
// # LSEG not supported
// # PATH not supported
// # POINT not supported
// # POLYGON not supported
// # TSQUERY, TSVECTOR not supported
// # TIMESTAMPTZ not supported
// # TIMESTAMP WITH TIME ZONE not supported
// # TIMETZ not supported
// # HLLSKETCH not supported
// # TIME WITH TIME ZONE not supported


const capitalize = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`

export const friendlyName = (text: string): string => {
    const [first, ...rest] = text.match(/[0-9]*[A-Za-z][a-z]*/g) || []
    return [capitalize(first), ...rest].join(' ')
}

type ApiErrorDetail = {
    name: string,
    statusCode: number,
    message: string
    data: {[key: string]: string}
}
export type ApiError = {
    status: 'error'
    error: ApiErrorDetail
}
export type ApiQueryResults = ApiError | {
    status: 'ok'
    results: {[col: string]: any}[]
}
export type ApiExploresResults = ApiError | {
    status: 'ok'
    results: Explore[]
}