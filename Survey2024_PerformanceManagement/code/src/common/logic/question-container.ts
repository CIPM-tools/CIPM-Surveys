import { SimpleCondition } from '../types/condition.js';
import { QuestionEncoding, Questions, QuestionTypes } from '../types/questions.js';

export class QuestionContainer {
    private codes: Map<string, QuestionEncoding> = new Map();

    constructor(private readonly questions: Questions) {
        questions.sections.forEach((section) => {
            section.encodings.forEach((encoding) => {
                this.codes.set(encoding.code, encoding);
            });
        });
    }

    getQuestion(code: string): QuestionEncoding | undefined {
        return this.codes.get(code);
    }

    getResponses(code: string): string[] {
        return this.codes.get(code)?.responses ?? [];
    }

    getResponseValues(code: string): string[] {
        if (this.getQuestionType(code) === 'mulitple-choice') {
            return [...this.getResponseCodeValueMapping(code).values()];
        } else {
            return this.getResponses(code);
        }
    }

    getResponseCodeValueMapping(code: string): Map<string, string> {
        const result: Map<string, string> = new Map();
        const responseCodes: string[] = this.getResponses(code);
        for (const code of responseCodes) {
            const question: QuestionEncoding | undefined = this.codes.get(code);
            if (question && question.responses.length > 0) {
                result.set(code, question.responses[0]);
            }
        }
        return result;
    }

    getAllCodes(): string[] {
        return [...this.codes.keys()];
    }

    getQuestionType(code: string): QuestionTypes | undefined {
        return this.codes.get(code)?.type;
    }

    getConditions(): SimpleCondition[] {
        return this.questions.conditions;
    }
}
