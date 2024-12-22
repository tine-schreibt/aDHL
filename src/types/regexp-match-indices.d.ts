declare module 'regexp-match-indices' {
    function execWithIndices(regexp: RegExp, str: string): (RegExpExecArray & {
        indices: Array<[number, number]>;
    }) | null;
    export default execWithIndices;
}