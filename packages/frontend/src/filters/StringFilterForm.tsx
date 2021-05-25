import {StringFilter, StringFilterGroup} from "common";
import {FilterRow, SelectFilterOperator} from "./FilterRow";
import React from "react";
import {ControlGroup, InputGroup, TagInput} from "@blueprintjs/core";

export const defaultValuesForNewStringFilter: {[key in StringFilter["operator"]]: StringFilter} = {
    equals: {operator: "equals", values: []},
    notEquals: {operator: "notEquals", values: []},
    startsWith: {operator: "startsWith", value: ''},
    isNull: {operator: "isNull"},
    notNull: {operator: "notNull"},
}

type StringFilterGroupFormProps = {
    filterGroup: StringFilterGroup,
    onChange: (filterGroup: StringFilterGroup) => void,
}

const options: {value: StringFilter["operator"], label: string}[] = [
    {value: "isNull", label: 'is null'},
    {value: "startsWith", label: 'starts with'},
    {value: "notNull", label: 'is not null'},
    {value: "equals", label: 'is equal to'},
    {value: "notEquals", label: 'is not equal to'},
]

const defaultNewFilter = defaultValuesForNewStringFilter['equals']

export const StringFilterGroupForm = ({filterGroup, onChange}: StringFilterGroupFormProps) => {
    return (
        <>
            {
                filterGroup.filters.map((filter, index) => (
                    <FilterRow
                        key={index}
                        isFirst={index === 0}
                        isLast={index === (filterGroup.filters.length - 1)}
                        tableName={filterGroup.dimension.table}
                        fieldName={filterGroup.dimension.name}
                        onAdd={() => onChange({...filterGroup, filters: [...filterGroup.filters, defaultNewFilter]})}
                        onDelete={() => onChange({
                            ...filterGroup,
                            filters: [...filterGroup.filters.slice(0, index), ...filterGroup.filters.slice(index + 1)]
                        })}
                    >
                        <ControlGroup style={{width: '100%'}}>
                            <SelectFilterOperator
                                value={filter.operator}
                                options={options}
                                onChange={operator => onChange({
                                    ...filterGroup,
                                    filters: [...filterGroup.filters.slice(0, index), defaultValuesForNewStringFilter[operator], ...filterGroup.filters.slice(index + 1)]
                                })}
                            />
                            <StringFilterForm
                                filter={filter}
                                onChange={fg => onChange({
                                    ...filterGroup,
                                    filters: [...filterGroup.filters.slice(0, index), fg, ...filterGroup.filters.slice(index + 1)]
                                })}
                            />
                        </ControlGroup>
                    </FilterRow>
                ))
            }
        </>
    )
}
type StringFilterFormProps = {
    filter: StringFilter,
    onChange: (filter: StringFilter) => void
}
// Can't switch generic: https://github.com/microsoft/TypeScript/pull/43183
const StringFilterForm = ({filter, onChange}: StringFilterFormProps) => {
    const filterType = filter.operator
    switch (filter.operator) {
        case "equals":
            return <TagInput
                fill={true}
                tagProps={{minimal: true}}
                values={filter.values}
                onAdd={values => onChange({...filter, values: [...filter.values, ...values]})}
                onRemove={(value, index) => onChange({
                    ...filter,
                    values: [...filter.values.slice(0, index), ...filter.values.slice(index + 1)]
                })}
            />
        case "notEquals":
            return <TagInput
                fill={true}
                tagProps={{minimal: true}}
                values={filter.values}
                onAdd={values => onChange({...filter, values: [...filter.values, ...values]})}
                onRemove={(value, index) => onChange({
                    ...filter,
                    values: [...filter.values.slice(0, index), ...filter.values.slice(index + 1)]
                })}
            />
        case "isNull":
            return null
        case "notNull":
            return <div></div>
        case "startsWith":
            return <InputGroup
                fill={true}
                value={filter.value}
                onChange={e => onChange({...filter, value: e.currentTarget.value})}
            />
        default:
            const nope: never = filter
            throw Error(`No form implemented for String filter operator ${filterType}`)
    }
}