// 定义俄罗斯方块的形状
const FIGURES = [
    // I 形
    [
        [1, 5, 9, 13],
        [4, 5, 6, 7]
    ],
    // Z 形
    [
        [4, 5, 9, 10],
        [2, 6, 5, 9]
    ],
    // S 形
    [
        [6, 7, 9, 10],
        [1, 5, 6, 10]
    ],
    // J 形
    [
        [1, 2, 5, 9],
        [0, 4, 5, 6],
        [1, 5, 9, 8],
        [4, 5, 6, 10]
    ],
    // L 形
    [
        [1, 5, 9, 10],
        [4, 5, 6, 8],
        [0, 1, 5, 9],
        [2, 4, 5, 6]
    ],
    // T 形
    [
        [1, 4, 5, 6],
        [1, 4, 5, 9],
        [4, 5, 6, 9],
        [1, 5, 6, 9]
    ],
    // O 形
    [
        [1, 2, 5, 6]
    ]
];