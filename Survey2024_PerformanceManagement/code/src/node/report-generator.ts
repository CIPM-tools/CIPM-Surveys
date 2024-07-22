import { resolve } from 'path';
import { QuestionContainer } from '../common/logic/question-container.js';
import { MatrixGraphics, MatrixSpecificGraphics } from '../common/types/matrix-graphics.js';
import { QuestionEncoding, Questions } from '../common/types/questions.js';
import { ResponseCount, SingleResponseCount, Statistics, StatisticsCollection } from '../common/types/response-count.js';
import { TextInputResponses } from '../common/types/TextInputResponses.js';
import { convertLongCodeToShortCode } from '../common/ui/plots-common.js';
import { writeFileContent } from './fs-utility.js';

export type Tag = 'all' | 'complete';

type CountGraphicPair = {
    tag: Tag;
    count: ResponseCount;
    graphic: string;
    matrixGraphics?: MatrixSpecificGraphics;
};

export class ReportGenerator {
    private currentTag: Tag = 'all';
    private singleGraphics: Map<string, CountGraphicPair[]> = new Map();
    private combinedGraphics: Map<string, CountGraphicPair[]> = new Map();
    private matrixGraphics: Map<string, CountGraphicPair[]> = new Map();
    private relationGraphics: Map<string, CountGraphicPair[]> = new Map();
    private texts: Map<Tag, TextInputResponses> = new Map();

    setTag(tag: Tag): void {
        this.currentTag = tag;
    }

    addSingleGraphic(code: string, count: ResponseCount, graphic: string): void {
        this.addNewPair(this.singleGraphics, code, count, graphic);
    }

    addCombinedGraphic(code: string, count: ResponseCount, graphic: string): void {
        this.addNewPair(this.combinedGraphics, code, count, graphic);
    }

    addMatrixGraphics(code: string, count: ResponseCount, graphics: MatrixGraphics): void {
        this.addNewPair(this.matrixGraphics, code, count, graphics.graphic, graphics);
    }

    addRelationGraphic(code: string, count: ResponseCount, graphic: string): void {
        this.addNewPair(this.relationGraphics, code, count, graphic);
    }

    addTexts(text: TextInputResponses): void {
        this.texts.set(this.currentTag, text);
    }

    private addNewPair(map: Map<string, CountGraphicPair[]>, code: string, count: ResponseCount, graphic: string, matrixGraphics?: MatrixSpecificGraphics): void {
        const newPair: CountGraphicPair = { count, graphic, tag: this.currentTag, matrixGraphics };
        if (map.has(code)) {
            map.get(code)?.push(newPair);
        } else {
            map.set(code, [newPair]);
        }
    }

    async generateReports(questionnaire: Questions, questionContainer: QuestionContainer, outputDirectory: string): Promise<string> {
        let all: string = '';
        let md: string = `# Results Report for *${questionnaire.introduction.title}* - Single Questions (`;
        let md2: string = md.slice();
        let md3: string = md.slice();
        md += 'Comparison of All and Completed Responses)\n\n';
        md2 += 'All Responses)\n\n';
        md3 += 'Complete Responses Only)\n\n';
        questionnaire.sections.forEach((section) => {
            section.encodings.forEach((encoding) => {
                const heading = `## \\[${convertLongCodeToShortCode(encoding.code)}\\] ${encoding.statement ? encoding.statement : encoding.text}\n\n`;

                if (encoding.type === 'free-text') {
                    md2 += heading;
                    md3 += heading;
                    md2 += this.generateTextResponseTexts(encoding.code, this.texts.get('all'));
                    md3 += this.generateTextResponseTexts(encoding.code, this.texts.get('complete'));
                    return;
                }

                if (!this.singleGraphics.has(encoding.code)) {
                    return;
                }

                const pair: CountGraphicPair[] | undefined = this.singleGraphics.get(encoding.code);
                if (pair) {
                    
                    md += heading;
                    md2 += heading;
                    md3 += heading;

                    md += this.generateTable(pair[0].count, questionContainer, { count2: pair[1].count, tag1: pair[0].tag, tag2: pair[1].tag });
                    md += `${pair[0].graphic}\n\n(${pair[0].tag})\n\n${pair[1].graphic}\n\n(${pair[1].tag})\n\n`;

                    const md2Index = pair[0].tag === 'all' ? 0 : 1;
                    const md3Index = (md2Index + 1) % 2;
                    md2 += this.generateTable(pair[md2Index].count, questionContainer);
                    md2 += pair[md2Index].graphic + '\n\n';
                    md2 += this.generateStatisticsTable(pair[md2Index].count);
                    md2 += this.generateTextResponseTexts(encoding.code, this.texts.get(pair[md2Index].tag));
                    md3 += this.generateTable(pair[md3Index].count, questionContainer);
                    md3 += pair[md3Index].graphic + '\n\n';
                    md3 += this.generateStatisticsTable(pair[md3Index].count);
                    md3 += this.generateTextResponseTexts(encoding.code, this.texts.get(pair[md3Index].tag));
                }
            });
        });
        await writeFileContent(resolve(outputDirectory, 'results-single.md'), md);
        await writeFileContent(resolve(outputDirectory, 'results-single-all.md'), md2);
        await writeFileContent(resolve(outputDirectory, 'results-single-complete.md'), md3);
        all += md + md2 + md3;

        md = `# Results Report for *${questionnaire.introduction.title}* - Combined Questions (`;
        md2 = md.slice();
        md += 'All Responses)\n\n';
        md2 += 'Complete Responses Only)\n\n';
        for (const entry of this.matrixGraphics.entries()) {
            for (const matrix of entry[1]) {
                let out = `## \\[${matrix.count.questionCodes.map(convertLongCodeToShortCode).join('\\] - \\[')}\\]\n\n`;
                out += this.generateQuestionTexts(questionContainer, matrix.count.questionCodes);
                out += this.generateTable(matrix.count, questionContainer);
                out += this.generateStatisticsTable(matrix.count);
                out += `${matrix.matrixGraphics?.absolute}\n\n${matrix.matrixGraphics?.relative}\n\n${matrix.graphic}\n\n${matrix.matrixGraphics?.box}\n\n`;
                matrix.tag === 'all' ? md += out : md2 += out;
            }
        }
        for (const entry of this.combinedGraphics.entries()) {
            for (const comb of entry[1]) {
                let out = `## \\[${comb.count.questionCodes.map(convertLongCodeToShortCode).join('\\] - \\[')}\\]\n\n`;
                out += this.generateQuestionTexts(questionContainer, comb.count.questionCodes);
                out += this.generateTable(comb.count, questionContainer);
                out += this.generateStatisticsTable(comb.count);
                out += comb.graphic + '\n\n';
                comb.tag === 'all' ? md += out : md2 += out;
            }
        }
        await writeFileContent(resolve(outputDirectory, 'results-combined-all.md'), md);
        await writeFileContent(resolve(outputDirectory, 'results-combined-complete.md'), md2);
        all += md + md2;

        md = `# Results Report for *${questionnaire.introduction.title}* - Questions Put Into Relations (`;
        md2 = md.slice();
        md += 'All Responses)\n\n';
        md2 += 'Complete Responses Only)\n\n';
        for (const entry of this.relationGraphics.entries()) {
            for (const relation of entry[1]) {
                let out = `## \\[${relation.count.questionCodes.map(convertLongCodeToShortCode).join('\\] x \\[')}\\]\n\n`;
                out += this.generateQuestionTexts(questionContainer, relation.count.questionCodes);
                out += relation.graphic + '\n\n';
                relation.tag === 'all' ? md += out : md2 += out;
            }
        }
        await writeFileContent(resolve(outputDirectory, 'results-related-all.md'), md);
        await writeFileContent(resolve(outputDirectory, 'results-related-complete.md'), md2);
        all += md + md2;
        return all;
    }

    private generateTable(count: ResponseCount, questionContainer: QuestionContainer, additional?: { count2: ResponseCount; tag1: Tag; tag2: Tag }): string {
        let result: string = '';
        if (count.questionCodes.length === 1 && additional) {
            result += `| Predefined Response | Frequency (${additional.tag1}) | Frequency (${additional.tag2}) |\n| - | - | - |\n`;
            result += count.
                counts.
                map(
                    (c) =>
                        `| ${c.codes[0]} | ${this.getSingleCountAsString(c)} | ${this.getSingleCountAsString(additional.count2.counts.filter((c2) => c2.codes[0] === c.codes[0])[0])} |`)
                .join('\n');
        } else if (count.questionCodes.length === 1) {
            result += '| Predefined Response | Frequency |\n| - | - |\n';
            result += count.counts.map((c) => `| ${c.codes[0]} | ${this.getSingleCountAsString(c)} |`).join('\n');
        } else {
            result += `| Predefined Response | ${count.questionCodes.map(convertLongCodeToShortCode).join(' | ')} |\n| - | ${count.questionCodes.map(() => '-').join(' | ')} |\n`;
            const responses: string[] = questionContainer.getResponseValues(count.questionCodes[0]);
            responses.forEach((r) => {
                const cellValues: SingleResponseCount[] = count.questionCodes.map((code) => count.counts.filter((value) => value.codes.includes(code) && value.codes.includes(r))[0]);
                result += `| ${r} | ${cellValues.map((value) => this.getSingleCountAsString(value)).join(' | ')} |\n`;
            });
        }
        return result + '\n\n';
    }

    private getSingleCountAsString(count?: SingleResponseCount): string {
        return count === undefined ? '' : count.count + (count.relativeFrequency ? ` (${(count.relativeFrequency * 100).toFixed(2)} %)` : '');
    }

    private generateStatisticsTable(count: ResponseCount): string {
        if (count.stats.length === 0) {
            return '';
        }
        const sortedQuantiles: StatisticsCollection[] = count.stats.map((coll) =>
            ({ code: coll.code, stats: coll.stats.filter((s) => s.type === 'quantile').sort((a, b) => a.quantile - b.quantile) }));
        if (sortedQuantiles[0].stats.length === 0) {
            return '';
        }
        let result = `| Quantile | ${sortedQuantiles.map((coll) => convertLongCodeToShortCode(coll.code)).join(' | ')} |\n| - | ${sortedQuantiles.map(() => '-').join(' | ')} |\n`;
        sortedQuantiles[0].stats.forEach((quantile, index) => {
            result += `| ${quantile.quantile} % | ${sortedQuantiles.map((coll) => coll.stats[index].value).join(' | ')} |\n`;
        });
        result += '\n';
        return result;
    }

    private generateQuestionTexts(questionContainer: QuestionContainer, codes: string[]): string {
        return codes.map((code) => {
            const question: QuestionEncoding | undefined = questionContainer.getQuestion(code);
            if (!question) {
                throw new Error(`Unknown question code '${code}'.`);
            }
            return `\\[${convertLongCodeToShortCode(code)}\\]: ${question.text === '' ? question.statement : question.text}`;
        }).join('\n\n') + '\n\n';
    }

    private generateTextResponseTexts(code: string, text?: TextInputResponses): string {
        if (text === undefined) {
            return '';
        }
        if (text[code] !== undefined) {
            return '* ' + text[code].join('\n* ') + '\n\n';
        }
        for (const key in text) {
            if (key.startsWith(code) && text[key].length > 0) {
                return `_Other Responses_\n\n* ${text[key].join('\n* ')}\n\n`;
            }
        }
        return '';
    }
}
