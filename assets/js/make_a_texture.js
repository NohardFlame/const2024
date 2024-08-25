function makeTextureAnim(initialCoord, destCoord, length) {
    let res = [];
    let v0;
    let v1;
    let v;
    for (let i = 0; i < length; ++i) {
        res.push([]);
    }
    for (let i = 0; i < initialCoord.length; ++i) {
        v0 = createVector(initialCoord[i][0], initialCoord[i][1]);
        v1 = createVector(destCoord[i][0], destCoord[i][1]);

        for (let j = 0; j < length; ++j) {
            v = p5.Vector.lerp(v0, v1, smth(j / (length - 1)));
            res[j].push(v.x);
            res[j].push(v.y);
        }
    }

    return res;
}

// function smth(t) {
//     if (t <= 0.5) {
//         return Math.pow(2, 20 * t - 10) / 2;
//     } else {
//         return (2 - Math.pow(2, -20 * t + 10)) / 2;
//     }
// }

// function smth(t) {
//     return 1 - Math.pow(2, -10 * t);
// }

// function smth(x) {
//     const n1 = 7.5625;
//     const d1 = 2.75;

//     if (x < 1 / d1) {
//         return n1 * x * x;
//     } else if (x < 2 / d1) {
//         return n1 * (x -= 1.5 / d1) * x + 0.75;
//     } else if (x < 2.5 / d1) {
//         return n1 * (x -= 2.25 / d1) * x + 0.9375;
//     } else {
//         return n1 * (x -= 2.625 / d1) * x + 0.984375;
//     }
// }

// function smth(x) {
//     const c4 = (2 * Math.PI) / 3;

//     return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 1 - 0.75) * c4) + 1;
// }

function smth(x) {
    return 1 - Math.pow(1 - x, 3);
}
