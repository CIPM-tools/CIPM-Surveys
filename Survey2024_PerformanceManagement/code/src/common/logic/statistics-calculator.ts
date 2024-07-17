import { Statistics } from '../types/response-count.js';
import { ResponseEntry, ResponseJson } from '../types/responses.js';
import { QuestionContainer } from './question-container.js';

export function calculateStatistics(questionContainer: QuestionContainer, answers: ResponseJson, code: string): Statistics[] {
    const result: Statistics[] = [];

    const predefinedResponses: string[] = questionContainer.getResponses(code);
    const sortedResponses: ResponseEntry[] = answers.
        responses.
        filter((entry) => entry[code] !== null && entry[code] !== '')
        .sort((a, b) => predefinedResponses.indexOf(a[code] as string) - predefinedResponses.indexOf(b[code] as string));

    if (sortedResponses.length === 0) {
        return result;
    }

    result.push({ type: 'quantile', quantile: 0, value: sortedResponses[0][code]! });
    if (sortedResponses.length % 4 === 0) {
        result.push(
            {
                type: 'quantile',
                quantile: 25,
                value: getValueBetweenTwoResponses(sortedResponses[sortedResponses.length / 4 - 1], sortedResponses[sortedResponses.length / 4], code)
            }
        );
    } else {
        result.push({ type: 'quantile', quantile: 25, value: sortedResponses[Math.ceil(sortedResponses.length / 4 - 1)][code]! });
    }
    if (sortedResponses.length % 2 === 0) {
        result.push(
            {
                type: 'quantile',
                quantile: 50,
                value: getValueBetweenTwoResponses(sortedResponses[sortedResponses.length / 2 - 1], sortedResponses[sortedResponses.length / 2], code)
            }
        );
    } else {
        result.push({ type: 'quantile', quantile: 50, value: sortedResponses[Math.ceil(sortedResponses.length / 2 - 1)][code]! });
    }
    if (sortedResponses.length % 4 === 0) {
        result.push(
            {
                type: 'quantile',
                quantile: 75,
                value: getValueBetweenTwoResponses(sortedResponses[sortedResponses.length / 4 * 3], sortedResponses[sortedResponses.length / 4 * 3 + 1], code)
            }
        );
    } else {
        result.push({ type: 'quantile', quantile: 75, value: sortedResponses[Math.ceil(sortedResponses.length / 4 * 3 - 1)][code]! });
    }
    result.push({ type: 'quantile', quantile: 100, value: sortedResponses[sortedResponses.length - 1][code]! });

    return result;
}

function getValueBetweenTwoResponses(r1: ResponseEntry, r2: ResponseEntry, code: string): string | number {
    const v1 = r1[code]!;
    const v2 = r2[code]!;
    const type1 = typeof v1;
    const type2 = typeof v2;
    if (type1 !== type2) {
        throw new Error(`'${v1}' (type '${type1}) has another type than '${v2}' (type '${type2}').`);
    }
    if (type1 === 'number') {
        return ((v1 as number) + (v2 as number)) / 2;
    } else {
        return v1 === v2 ? v1 : v1 + ' - ' + v2;
    }
}
