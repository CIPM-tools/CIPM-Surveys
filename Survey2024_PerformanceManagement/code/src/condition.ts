export type RequiredValue = {
    code: string;
    value: string;
};

export type SimpleCondition = {
    conditionedCode: string;
    required: RequiredValue;
};
