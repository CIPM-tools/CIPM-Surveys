import { RequiredValue } from './condition';
import { QuestionContainer } from './question-container';
import { ResponseEntry } from './responses';

export function checkConditions(code: string, questionContainer: QuestionContainer, responseEntry: ResponseEntry): boolean {
    for (const cond of questionContainer.getConditions()) {
        if (cond.conditionedCode === code) {
            if (checkRequiredValue(cond.required, responseEntry)) {
                return true;
            } else {
                return false;
            }
        }
    }
    return true;
}

export function checkRequiredValue(value: RequiredValue, responseEntry: ResponseEntry): boolean {
    return responseEntry[value.code] === value.value;
}
