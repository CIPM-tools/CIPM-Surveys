export function unformatCode(code: string): string {
    return code.replace('[', '').replace(']', '');
}
