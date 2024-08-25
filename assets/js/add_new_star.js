function delete_star(d, v_num) {
    console.log(12312);
    if (v_num <= d.const_verts["vert" + d.star_animation.current_constallation].number) {
        if (confirm("Точно удалить?")) {
            d.const_verts["orig" + d.star_animation.current_constallation].number -= 1;
            d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][2] = "DELETED";
            d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][3] = "DELETED";
            //console.log(12312);
            swap_stars(d, v_num, d.const_verts["orig" + d.star_animation.current_constallation].number);
            SaveConstOnServer(
                "const" + d.star_animation.current_constallation,
                JSON.stringify(d.const_verts["orig" + d.star_animation.current_constallation])
            );
        }
    }
    d.update_all(width, height);
}

function add_new_star(d, v_num) {
    console.log(v_num);
    if (v_num < d.const_verts["vert" + d.star_animation.current_constallation].number) {
        let title = prompt(
            "Введите заголовок",
            d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][2]
        );
        if (title != "" && title != null) {
            let content = prompt(
                "Введите достижение",
                d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][3]
            );
            if (content != "" && content != null) {
                d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][2] = title;
                d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][3] = content;
                SaveConstOnServer(
                    "const" + d.star_animation.current_constallation,
                    JSON.stringify(d.const_verts["orig" + d.star_animation.current_constallation])
                );
            } else {
                alert("Вод отменен");
            }
        } else {
            alert("Вод отменен");
        }
    } else {
        let title = prompt(
            "Введите заголовок",
            d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][2]
        );
        if (title != "" && title != null) {
            let content = prompt(
                "Введите достижение",
                d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][3]
            );
            if (content != "" && content != null) {
                d.const_verts["orig" + d.star_animation.current_constallation].number += 1;
                d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][2] = title;
                d.const_verts["orig" + d.star_animation.current_constallation].vert[v_num][3] = content;
                //console.log(12312);
                swap_stars(d, v_num, d.const_verts["orig" + d.star_animation.current_constallation].number - 1);
                SaveConstOnServer(
                    "const" + d.star_animation.current_constallation,
                    JSON.stringify(d.const_verts["orig" + d.star_animation.current_constallation])
                );
            } else {
                alert("Вод отменен");
            }
        } else {
            alert("Вод отменен");
        }
    }
    d.update_all(width, height);
}

function swap_stars(d, n1, n2) {
    console.log(n1, n2);
    let tmp = d.const_verts["orig" + d.star_animation.current_constallation].vert[n1];

    d.const_verts["orig" + d.star_animation.current_constallation].vert[n1] =
        d.const_verts["orig" + d.star_animation.current_constallation].vert[n2];

    d.const_verts["orig" + d.star_animation.current_constallation].vert[n2] = tmp;
}

async function SaveConstOnServer(filename, JSONObj) {
    let response = await fetch("JSONSaver.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: filename,
            obj: JSONObj,
        }),
        // name: filename,
        // body: JSONObj,
    });
    //console.log(JSONObj);
    let result = await response.text();
    //console.log(result);
}
