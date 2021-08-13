/** @internal */
export const _topologySort = <T>(graph: Iterable<T>, edges: (node: T) => Iterable<T>): T[] => {
    const result: T[] = [];
    const marked = new Set<T>();

    const visit = (node: T): void => {
        if (!marked.has(node)) {
            marked.add(node);
            for (const next of edges(node)) {
                visit(next);
            }
            result.push(node);
        }
    };

    for (const node of graph) {
        visit(node);
    }

    return result;
};
