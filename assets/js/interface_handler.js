function mouseHandler(con, scaleFactor) {
    //console.log(con);
    let x = (mouseX / width) * 2 - 1;
    let y = -((mouseY / height) * 2 - 1);
    let trashold = 0.02 * scaleFactor;
    for (let i = 0; i < con.length; ++i) {
        if (x > con[i][0] * scaleFactor - trashold && x < con[i][0] * scaleFactor + trashold) {
            if (y > con[i][1] * scaleFactor - trashold && y < con[i][1] * scaleFactor + trashold) {
                //console.log(i);
                return i;
            }
        }
    }
    return -1;
}

function displayText(progress, con, fb) {
    fb.begin();
    background(0);
    for (let i = int(progress) - 3; i < int(progress) + 5; ++i) {
        if (i > -1 && i < con.length) {
            textSize(int(height * 0.06));
            textAlign(CENTER, CENTER);
            text(
                con[i][2],
                (-fb.width / 2) * 0.95,
                -(fb.height / 2) * (0.3 - i * 0.35 + 0.35 * progress),
                fb.width,
                fb.height * 0.1
            );

            textSize(int(fb.height * 0.03));
            textAlign(CENTER, TOP);
            text(
                con[i][3],
                -(fb.width / 2) * 0.95,
                -(fb.height / 2) * (0.1 - i * 0.35 + 0.35 * progress),
                fb.width,
                (fb.height / 2) * 0.35
            );
        }
    }
    fb.end();
    return fb;
}
