import { _topologySort } from "../src/internal/topology-sort";

describe("topology-sort", () => {
    it("can sort view keys by dependencies", () => {
        interface View {
            key: number;
            dependencies: number[];
        }

        const views: View[] = [
            {
                key: 2,
                dependencies: [11],
            },
            {
                key: 3,
                dependencies: [],
            },
            {
                key: 5,
                dependencies: [],
            },
            {
                key: 7,
                dependencies: [],
            },
            {
                key: 8,
                dependencies: [7, 3],
            },
            {
                key: 9,
                dependencies: [8, 11],
            },
            {
                key: 10,
                dependencies: [3, 11],
            },
            {
                key: 11,
                dependencies: [5, 7],
            },
        ];

        const unsorted = views.map(v => v.key);
        const sorted = _topologySort(unsorted, k => views.filter(v => v.key === k)[0].dependencies);
        const expected = [
            5, 7, 11, 2, 3, 8, 9, 10
        ];

        expect(sorted).toMatchObject(expected);
    });
});