// Settings

const BASE_PAYMENT = 4; // Predicting the experiment will take 40 minutes
const MAX_BONUS = 3;
const CRYSTAL_CAT = [10,  25, 40, 55, 70];
const TUTORIAL_TRIALS = 2;
const INIT_TUTORIAL_PAYMENT = 100;
const ECOCRD_NOISE = 10.;
const NUM_TRIALS = 50;
const POINT_VALUE = (BASE_PAYMENT + MAX_BONUS) / 10802; // The max number of points (without considering luck) is around this number
const URLPARAMS = new URLSearchParams(window.location.search);
const PROLIFIC_PID = URLPARAMS.get("PROLIFIC_PID");
const COMPLETION_CODE = "C14AAQXM";
const PROLIFIC_COMPLETE = `https://app.prolific.com/submissions/complete?cc=${COMPLETION_CODE}`;
const PROLIFIC_ABORT = "https://app.prolific.com/submissions/complete?cc=NOCODE";
const DATA_URL = "/savedata";
const MAXCRYSTAL = 200;
const NUM_CRYSTALS = 5;

var tutorial_instructions = document.getElementById("tutorial-instructions").querySelectorAll("p");
var review_instructions = document.getElementById("review-instructions");
tutorial_instructions.forEach(element => {
    review_instructions.appendChild(element.cloneNode(true));
});


var start_time = null;

var results = "time,event,points,value,score\n";

function add_results(event, points, value, score) {
    let text = `${Date.now()},${event},${points},${value},${score}\n`;
    results = results.concat(text);
}

function to_pence(points) {
    return Math.round(points * POINT_VALUE * 10_000) / 100;
}

function to_points(pence) {
    return pence/(100 * POINT_VALUE);
}

function send_results() {
    // document.getElementById("completion_code").innerHTML = COMPLETION_CODE;
    document.getElementById("finished").style.display = "block";
}

// Preload images

var preloaded_images = [];
function preload_images() {
    for (let i = 0; i < arguments.length; i++) {
        preloaded_images[i] = new Image();
        preloaded_images[i].src = preload_images.arguments[i];
    }
}

// Found on Stackoverflow
// Standard Normal variate using Box-Muller transform.
function randn() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

const ecocrdcoefs = [139.612846, 0.34240514, -0.0434761592, 0.00196503669, -3.96512891e-05, 3.94289139e-07, -2.14003066e-09, 6.07033952e-12, -7.05247883e-15];

function get_ecocrd(points) {
    let mean_ecocrd = 0.;
    let p = 1.;
    for (let i = 0; i < ecocrdcoefs.length; i++) {
        mean_ecocrd += ecocrdcoefs[i] * p;
        p *= points;
    }
    let ecocrd = mean_ecocrd + randn() * ECOCRD_NOISE;
    return ecocrd;
}

function get_ecocrd_prediction_points(prediction, ecocrd) {
    return 10*Math.exp(-0.05*Math.abs(prediction - ecocrd));
}

window.onload = function() {
    // if ((!PROLIFIC_PID || PROLIFIC_PID.length === 0 )) {
    //     window.alert("ERROR: Prolific ID missing from URL. Please verify the URL on Prolific’s website.");
    //     return;
    // }
    // add_results("PROLIFIC_PID", 0, PROLIFIC_PID, 0);
    substitute_constants();
    preload_images(
        "img/astronaut_small.png",
        "img/crystals.jpg",
        "img/planet.png",
        "img/spaceship.png",
        "img/ticket.png",
        "img/page_next.png",
        "img/page_previous.png",
        "img/greeting_astronaut.png",
        "img/sky.png",
        "img/sky_planet.png",
        "img/crystal_profit.jpg",
        "img/arrow_collect.png",
        "img/arrow_discard.png",
        "img/arrow_score.png",
        "img/arrow_bonus.png",
        "img/arrow_bonus_prediction.png",
        "img/auditor.png",
        "img/crystal1.jpg",
        "img/crystal2.jpg",
        "img/crystal3.jpg",
        "img/crystal4.jpg",
        "img/crystal5.jpg",
        "img/crystal6.jpg",
        "img/miner1.png",
        "img/miner2.png",
        "img/miner3.png",
        "img/miner4.png",
        "img/miner5.png",
        "img/miner6.png",
        "img/miner7.png",
        "img/miner8.png",
        "img/miner9.png",
        "img/miner10.png",
        "img/crystal_collect.png",
        "img/crystal_points.png",
        "img/crystals_unique.png",
        "img/disable_mining.png",
        "img/space_start.png",
        "img/spaceship_flying.png",
        "img/zyxlon.jpg",
        "img/own_prediction.png",
        "img/crystal5_predict.png",
        "img/colleague_prediction.png",
        "img/own_prediction_results.png",
        "img/ecocrd.png",
        "img/mini_game.png",
        "img/colleague_prediction_results.png",
        "img/quiz_correct.png",
        "img/quiz_incorrect.png",
    );
    let start_button = document.querySelector("#start-button");
    start_button.innerHTML = "I AGREE, START THE EXPERIMENT";
    start_button.removeAttribute("disabled");
    start_button.onclick = function() {
        // Check if all checkboxes are checked
        let checked = true;
        for (let checkbox of document.querySelectorAll("input[type=checkbox]")) {
            if (!checkbox.checked) {
                checked = false;
                break;
            }
        }
        if (!checked) {
            window.alert("Please check each box if you wish to take part in this study.");
            return;
        }
        document.documentElement.requestFullscreen();
    }
    document.onfullscreenchange = start_experiment;
    // start_experiment();
}

var game_maxtime_timeout;

function game_maxtime_exceeded() {
    window.alert(`TIME OUT. You are over ${MAX_TIME}, and your experiment is cancelled.`);
    document.exitFullscreen();
}

function start_experiment() {
    // Disable right click
    document.addEventListener("contextmenu", event => event.preventDefault());
    document.querySelector("#ethics").remove();
    document.body.className = "running";
    
    run_instructions(
        null,
        document.querySelector("#tutorial-instructions"),
        function(last_page) {
            run_tutorial(last_page);
        });
    // run_tutorial(null);
    // run_instructions(
    //         null,
    //         document.querySelector("#quiz-instructions"),
    //         function(last_page) {
    //             run_quiz(last_page);
    //         });
    // run_quiz(null);
    // run_trials(null, false, show_feedback);
    // show_feedback(100);
}

function substitute_constants() {
    for (let span of document.querySelectorAll("span.constant")) {
        if (span.classList.contains("BASE_PAYMENT")) {
            span.append(BASE_PAYMENT.toFixed(2));
        }
        else if (span.classList.contains("MAX_PAYMENT")) {
            span.append((BASE_PAYMENT + MAX_BONUS).toFixed(2));
        }
        else if (span.classList.contains("MAX_BONUS")) {
            span.append(MAX_BONUS.toFixed(2));
        }
        else if (span.classList.contains("MAX_TIME")) {
            span.append(MAX_TIME.toString());
        }
        else if (span.classList.contains("NUM_TRIALS")) {
            span.append(NUM_TRIALS.toString());
        }
        else if (span.classList.contains("INIT_TUTORIAL_PAYMENT")) {
            span.append(`£${(INIT_TUTORIAL_PAYMENT*0.01).toFixed(2)}`);
        }
        else if (span.classList.contains("MAX_PREDICTION_POINTS")) {
            let val = to_pence(get_ecocrd_prediction_points(100, 100));
            span.append(val.toFixed(2));
        }
    }
}

var timeout = null;

function set_game_timeout(func, timeout) {
    timeout = setTimeout(func, timeout);
}

function abort_experiment() {
    document.body.className = "aborted";
    document.onkeydown = null;
    document.exitPointerLock();
    clearTimeout(timeout);
    clearTimeout(game_maxtime_timeout);
    // fetch(DATA_URL, {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "text/plain",
    //     },
    //     body: `ProlificID=${PROLIFIC_PID}&data=${encodeURIComponent(results)}`,
    // }).then((response) => {
    //     window.location.replace(PROLIFIC_ABORT);
    // }).catch(err => {
    //     window.location.replace(PROLIFIC_ABORT);
    // });
    // document.body.className = "aborted";
    // document.onkeydown = null;
    // clearTimeout(timeout);
    // clearTimeout(game_maxtime_timeout);
    // let aborted = document.querySelector("#aborted");
    // aborted.style.display = "block";
}

function show_screen(oldscreen, newscreen) {
    if (oldscreen) oldscreen.style.display = "none";
    newscreen.style.display = "block";
    function hide_screen() {
        newscreen.style.display = "none";
        abort_experiment();
    };
    document.onfullscreenchange = hide_screen;
}

function get_prediction(input) {
    return to_pence(input.value/(input.max - input.min)*600 - 400);
}

function run_instructions(oldscreen, instructions, endfunction) {
    let pages = instructions.children;
    // Add the arrows for navigation
    for(let i = 0; i < pages.length; i++) {
        if (i > 0) {
            let arrow = document.createElement("img");
            arrow.classList = "page_previous";
            arrow.onclick = function() {
                if (i == 1 && !start_time) start_time = Date.now();
                add_results("instructions", 0, "previous", 0);
                show_screen(pages[i], pages[i - 1]);
            }
            pages[i].appendChild(arrow);
        }
        if (i < pages.length - 1) {
            let arrow = document.createElement("img");
            arrow.classList = "page_next";
            arrow.onclick = function() {
                add_results("instructions", 0, "next", 0);
                show_screen(pages[i], pages[i + 1]);
            }
            pages[i].appendChild(arrow);
        }
        else {
            let button = pages[i].querySelector("button");
            button.onclick = function() {
                add_results("instructions", 0, "finish", 0);
                endfunction(pages[i]);
            }
        }
    }
    add_results("instructions", 0, null, 0);
    show_screen(oldscreen, pages[0]);
}

function get_crystal_points() {
    return Math.exp(randn()*0.8 + 3.2);
}

function get_crystals(crystal_vals) {
    while (true) {
        for (let i = 0; i < NUM_CRYSTALS; i++) {
            crystal_vals[i] = get_crystal_points();
        }
        let total = crystal_vals.reduce((a, b) => a + b, 0);
        if (total <= MAXCRYSTAL) {
            break;
        }
    }
    for (let i = 0; i < NUM_CRYSTALS; i++) {
        crystal_vals[i] = to_pence(crystal_vals[i]);
    }
}

function get_crystal_cat(val) {
    let i = 0;
    while (i < CRYSTAL_CAT.length && val > CRYSTAL_CAT[i]) {
        i += 1;
    }
    return i + 1;
}

// Game display

const flightscreen = document.querySelector("#flightscreen");
const crystalscreen = document.querySelector("#crystal_collect");
const crystal_num_display = document.querySelector("#crystal_num");
const crystal_points = document.querySelector("#crystal_points_text");
const discard_points = document.querySelector("#discard_points");
const collect_points = document.querySelector("#collect_points");
const score_points = document.querySelectorAll(".score_points");
const crystal5_disable = document.querySelector("#crystal5_disable");
const ecocrd_prediction_screen = document.querySelector("#ecocrd_prediction_screen");
const ecocrd_prediction_results_screen = document.querySelector("#ecocrd_prediction_results");
const colleague_prediction_screen = document.querySelector("#colleague_prediction_screen");
const current_ecocrd_prediction = document.querySelector("#current_ecocrd_prediction");
const ecocrd_crystal5_points = document.querySelector("#ecocrd_crystal5_points");
const discard = document.querySelector("#discard");
const collect = document.querySelector("#collect");
const ecocrd_discard_points = document.querySelector("#ecocrd_discard_points");
const ecocrd_collect_points = document.querySelector("#ecocrd_collect_points");
const crystal5info = document.querySelector("#crystal5info");
const ecocrd_input = document.querySelector("#ecocrd_prediction input");
const ecocrd_screen = document.querySelector("#ecocrd_screen");
const ecocrd_points = document.querySelector("#ecocrd_points_text");
const ecocrd_prediction_points = document.querySelector("#ecocrd_prediction_points");
const crystal_tutorial_message = document.querySelector("#crystal_collect .tutorial");
const flight_tutorial_message = document.querySelector("#flightscreen .tutorial");

function score_fade() {
    for (let score of document.querySelectorAll(".score")) {
        score.classList.add('score-final');
    }
}

function update_score(score, change) {
    let centipence = Math.round(score * 100);
    let subpence = centipence % 100;
    if (subpence < 10) {
        subpence = `0${subpence.toString()}`;
    }
    else {
        subpence = subpence.toString();
    }
    let pounds = (centipence - subpence)*0.0001;
    for (let scoretext of score_points) {
        scoretext.innerHTML = `£${pounds.toFixed(2)}<sup>${subpence}</sup>`;
    }
    for (let score of document.querySelectorAll(".score")) {
        score.classList.remove('score-final');
        if (change > 0) {
            score.classList.add('score-increase');
            score.classList.remove('score-decrease');
            setTimeout(score_fade, 1);
        }
        else if (change < 0) {
            score.classList.add('score-decrease');
            score.classList.remove('score-increase');
            setTimeout(score_fade, 1);
        }
        else {
            score.classList.remove('score-decrease');
            score.classList.remove('score-increase');
        }
    }
}

function run_tutorial(oldscreen) {
    run_trials(oldscreen, true, function(score) {
        run_instructions(
            ecocrd_prediction_results_screen,
            document.querySelector("#quiz-instructions"),
            function(last_page) {
                run_quiz(last_page);
            });
    });
}

function finish_experiment() {
    let participant_feedback = document.querySelector("#participant_feedback");
    add_results("feedback", 0, JSON.stringify(participant_feedback.value), 0);
    document.onkeydown = null;
    document.querySelector("#feedback_screen").style.display = "none";
    document.body.className = "finished";
    document.querySelector("#results").href = 'data:text/plain;charset=utf-8,'.concat(
        encodeURIComponent(results)
    );
    send_results();
}

function show_feedback(score) {
    clearTimeout(game_maxtime_timeout);
    let feedback_screen = document.querySelector("#feedback_screen");
    let submit_button = document.querySelector("#submit_feedback");
    let payment_text = document.querySelector("#payment");
    let payment = Math.round(score)*0.01;
    if (payment < BASE_PAYMENT)
        payment = BASE_PAYMENT;
    else if (payment > BASE_PAYMENT + MAX_BONUS)
        payment = BASE_PAYMENT + MAX_BONUS;
    payment_text.innerHTML = payment.toFixed(2);
    add_results("payment", 0, payment.toFixed(2), score);
    show_screen(ecocrd_prediction_results_screen, feedback_screen);
    document.onfullscreenchange = finish_experiment;
    submit_button.onclick = function() {
        document.exitFullscreen();
    }
}

const crystal_num_str = ["first", "second", "third", "fourth", "fifth"];

function run_trials(oldscreen, tutorial, endfunction) {
    let trial = 0;
    let crystal_vals = [0, 0, 0, 0, 0];
    let crystal_num;
    let crystal_val;
    let crystal_cat;
    let score = tutorial? INIT_TUTORIAL_PAYMENT : 0;
    let dailyscore = 0;
    let ecocrd_predicted;
    let ecocrd_prediction;
    const num_trials = (tutorial) ? TUTORIAL_TRIALS : NUM_TRIALS;
    let last_collected = null;

    if (!tutorial) {
        for (let t of document.querySelectorAll(".tutorial")) {
            t.style.display = "none";
        }
        crystalscreen.querySelector("#crystal_collect_disable").style.display = "none";
    }

    function run_flight(oldscreen) {
        crystal_num = 1;
        dailyscore = 0;
        ecocrd_predicted = false;
        get_crystals(crystal_vals);
        update_score(score, 0.);
        if (tutorial) flight_tutorial_message.style.display = "none";
        show_screen(oldscreen, flightscreen);
        if (tutorial) {
            set_game_timeout(function() {
                flight_tutorial_message.style.display = "block";
                set_game_timeout(function() {
                    flight_tutorial_message.style.display = "none";
                    set_game_timeout(run_crystals, 1000);
                }, 10000);
            }, 1000);
        }
        else {
            set_game_timeout(run_crystals, 1000);
        }
    }
    function run_crystals() {
        let tutorial_message = crystalscreen.querySelector(".tutorial");
        if (crystal_num < 5) {
            crystal_val = crystal_vals[crystal_num - 1];
            crystal_cat = get_crystal_cat(to_points(crystal_val));
            crystalscreen.classList.add(`crystal${crystal_cat}`);
            crystal_num_display.innerHTML = crystal_num.toString();
            crystal_points.innerHTML = crystal_val.toFixed(2);
            discard_points.innerHTML = dailyscore.toFixed(2);
            collect_points.innerHTML = (dailyscore + crystal_val).toFixed(2);
            show_screen(flightscreen, crystalscreen);
        }
        function show_tutorial_messages() {
            crystalscreen.querySelector("#crystal_collect_disable").style.display = "block";
            tutorial_message.style.display = "none";
            function display_message(message, time, next_message) {
                set_game_timeout(function() {
                    tutorial_message.innerHTML = message;
                    tutorial_message.style.display = "block";
                    set_game_timeout(function() {
                        tutorial_message.style.display = "none";
                        next_message();
                    }, time);
                }, 1000);
            }
            function message1() {
                display_message(
                    `This is the ${crystal_num_str[crystal_num - 1]} crystal you’ve found today. It’s worth ${crystal_val.toFixed(2)} pence.`,
                    7000,
                    message2
                );
            }
            function message2() {
                display_message(
                    `If you collect this crystal, your overall payment (top left) will instantly increase by ${crystal_val.toFixed(2)}p.`,
                    7000,
                    message3
                );
            }
            function message3() {
                display_message(
                    `Your daily crystal payment will also increase to ${(dailyscore + crystal_val).toFixed(2)}p (${dailyscore.toFixed(2)} + ${crystal_val.toFixed(2)}), the number inside the COLLECT box.`,
                    8000,
                    choose_crystal
                );
            }
            function choose_crystal() {
                tutorial_message.innerHTML = `Now you can collect or discard the ${crystal_num_str[crystal_num - 1]} crystal by clicking on COLLECT or DISCARD.`;
                tutorial_message.style.display = "block";
                crystalscreen.querySelector("#crystal_collect_disable").style.display = "none";
            }
            function message_response() {
                let message;
                if (last_collected) {
                    message = `You’ve collected the ${crystal_num_str[crystal_num - 2]} crystal, so your overall payment (top left) has increased to £${(score*0.01).toFixed(4)}.`;
                }
                else {
                    message = `You’ve discarded the ${crystal_num_str[crystal_num - 2]} crystal, so your overall payment (top left) has stayed at £${(score*0.01).toFixed(4)}.`;
                }
                display_message(
                    message,
                    8000,
                    (crystal_num < 3)? message1 : choose_crystal
                );
            }
            if (crystal_num == 1) {
                message1();
            }
            else if (crystal_num < 5) {
                message_response();
            }
            else {
                choose_crystal();
            }
        }
        if (tutorial) show_tutorial_messages();
        function advancecrystal(change) {
            if (crystal_num < 5) {
                crystal_num += 1;
                crystal_num_display.innerHTML = crystal_num.toString();
                crystalscreen.classList.remove(`crystal${crystal_cat}`);
                crystal_val = crystal_vals[crystal_num - 1];
                crystalscreen.classList.remove(`crystal${crystal_cat}`);
                crystal_cat = get_crystal_cat(to_points(crystal_val));
                crystalscreen.classList.add(`crystal${crystal_cat}`);
                crystal_num_display.innerHTML = crystal_num.toString();
                crystal_points.innerHTML = crystal_val.toFixed(2);
                discard_points.innerHTML = dailyscore.toFixed(2);
                collect_points.innerHTML = (dailyscore + crystal_val).toFixed(2);
                update_score(score, change);
                if (crystal_num == 5) {
                    crystal5_disable.style.display = "block";
                    if (tutorial) crystal_tutorial_message.style.display = "none";
                }
                else if (tutorial) show_tutorial_messages();
            }
            else {
                crystalscreen.classList.remove(`crystal${crystal_cat}`);
                document.onkeydown = null;
                run_ecocrd_screen();
            }
        }
        collect.onclick = function() {
            last_collected = true;
            if (crystal_num < 5 || ecocrd_predicted) {
                score += crystal_val;
                dailyscore += crystal_val;
                add_results("crystal", crystal_val, "collect", score);
                advancecrystal(crystal_val);
            }
        }
        discard.onclick = function() {
            last_collected = false;
            if (crystal_num < 5 || ecocrd_predicted) {
                add_results("crystal", crystal_val, "discard", score);
                advancecrystal(0.);
            }
        }
        crystal5_disable.querySelector("button").onclick = function() {
            // Move to ecocrd prediction
            crystal5_disable.style.display = "none";
            if (tutorial) crystal_tutorial_message.style.display = "block";
            run_own_ecocrd_prediction();
        }
    }
    function run_own_ecocrd_prediction() {
        crystal5info.classList.add(`crystal${crystal_cat}`);
        ecocrd_crystal5_points.innerHTML = crystal_val.toFixed(2);
        ecocrd_discard_points.innerHTML = dailyscore.toFixed(2);
        ecocrd_collect_points.innerHTML = (dailyscore + crystal_val).toFixed(2);
        ecocrd_input.value = Math.trunc(Math.random() * (ecocrd_input.max - ecocrd_input.min)) + ecocrd_input.min;
        current_ecocrd_prediction.innerHTML = get_prediction(ecocrd_input).toFixed(2);
        show_screen(crystalscreen, ecocrd_prediction_screen);
        ecocrd_input.focus();
        let prediction_changed = 0;
        ecocrd_input.oninput = function() {
            current_ecocrd_prediction.innerHTML = get_prediction(ecocrd_input).toFixed(2);
            prediction_changed = 1;
        }
        ecocrd_prediction_screen.querySelector(".predict").onclick = function() {
            ecocrd_prediction = get_prediction(ecocrd_input);
            ecocrd_predicted = true;
            crystal5info.classList.remove(`crystal${crystal_cat}`);
            add_results("own_ecocrd_prediction", 0, ecocrd_prediction, score);
            add_results("own_ecocrd_prediction_changed", 0, prediction_changed, score);
            show_screen(ecocrd_prediction_screen, crystalscreen);
            run_crystals();
        }
    }
    function run_ecocrd_screen() {
        let ecocrd = to_pence(get_ecocrd(to_points(dailyscore)));
        score += ecocrd;
        update_score(score, ecocrd);
        let ecocrd_class;
        if (ecocrd > 0) {
            ecocrd_class = "positive";
            ecocrd_points.innerHTML = `+${ecocrd.toFixed(2)}p`;
        }
        else if(ecocrd < 0) {
            ecocrd_class = "negative";
            ecocrd_points.innerHTML = `&minus;${-ecocrd.toFixed(2)}p`;
        } 
        else {
            ecocrd_class = "zero";
            ecocrd_points.innerHTML = "0p";
        }
        ecocrd_points.classList.add(ecocrd_class);
        add_results("ecocrd", ecocrd, null, score);
        ecocrd_screen.querySelector(".tutorial").innerHTML = `You’ve earned ${ecocrd.toFixed(2)}p in Eco-Credits! This value was calculated based on your daily crystal payment of ${dailyscore.toFixed(2)}p. Click CONTINUE when it appears.`
        show_screen(crystalscreen, ecocrd_screen);
        let continue_button = ecocrd_screen.querySelector("button");
        continue_button.style.display = "none";
        set_game_timeout(function() {
            continue_button.onclick = function() {
                ecocrd_points.classList.remove(ecocrd_class);
                run_own_ecocrd_prediction_results(ecocrd);
            }
            continue_button.style.display = "block";
        }, tutorial? 8000 : 2000);
    }
    function run_own_ecocrd_prediction_results(ecocrd) {
        let prediction_points = to_pence(get_ecocrd_prediction_points(to_points(ecocrd_prediction), to_points(ecocrd)));
        score += prediction_points;
        update_score(score, prediction_points);
        ecocrd_prediction_points.innerHTML = `${prediction_points.toFixed(2)}p`;
        add_results("own_ecocrd_prediction_points", prediction_points, null, score);
        ecocrd_prediction_results_screen.querySelector("#crystal_score_predresults").innerHTML = dailyscore.toFixed(2);
        ecocrd_prediction_results_screen.querySelector("#tax_payment_predresults").innerHTML = (ecocrd >= 0) ? `+${ecocrd.toFixed(2)}` : `&minus;${-ecocrd.toFixed(2)}`;
        if (tutorial) {
            ecocrd_prediction_results_screen.querySelector("#whos_taxes").innerHTML = "your";
        }
        let total = (dailyscore + ecocrd);
        let totalstr;
        if (total >= 0) {
            totalstr = total.toFixed(2);
        }
        else {
            totalstr = `&minus;${-total.toFixed(2)}`;
        }
        ecocrd_prediction_results_screen.querySelector("#total_predresults").innerHTML = totalstr;
        ecocrd_prediction_results_screen.classList.add("own_taxes_prediction");
        show_screen(ecocrd_screen, ecocrd_prediction_results_screen);
        let continue_button = ecocrd_prediction_results_screen.querySelector("button");
        continue_button.style.display = "none";
        continue_button.onclick = function() {
            ecocrd_prediction_results_screen.classList.remove("own_taxes_prediction");
            run_colleague_ecocrd_prediction();
        }
        set_game_timeout(function() {
            continue_button.style.display = "block";
        }, tutorial? 8000 : 2000);
    }
    function run_colleague_ecocrd_prediction() {
        let colleague_crystalscore;
        do {
            // This gives a reasonable number of points
            colleague_crystalscore = 45*randn() + 80;
        }
        while (colleague_crystalscore < 0 || colleague_crystalscore > MAXCRYSTAL);
        colleague_crystalscore = to_pence(colleague_crystalscore);
        colleague_prediction_screen.querySelector("#colleague_crystal_score").innerHTML = colleague_crystalscore.toFixed(2);
        let ecocrd_input = colleague_prediction_screen.querySelector("input");
        let current_ecocrd_prediction = colleague_prediction_screen.querySelector("#colleague_ecocrd_prediction");
        let minerno = Math.trunc(Math.random() * 10) + 1;
        colleague_prediction_screen.classList.add(`colleague_taxes_prediction${minerno}`);
        current_ecocrd_prediction.innerHTML = get_prediction(ecocrd_input).toFixed(2);
        show_screen(ecocrd_prediction_results_screen, colleague_prediction_screen);
        ecocrd_input.focus();
        
        let prediction_changed = 0;
        ecocrd_input.oninput = function() {
            current_ecocrd_prediction.innerHTML = get_prediction(ecocrd_input).toFixed(2);
            prediction_changed = 1;
        }
        colleague_prediction_screen.querySelector(".predict").onclick = function() {
            add_results("colleague_crystalscore", 0, colleague_crystalscore, score);
            add_results("colleague_ecocrd_prediction", 0, get_prediction(ecocrd_input).toFixed(2), score);
            add_results("colleague_ecocrd_prediction_changed", 0, prediction_changed, score);
            colleague_prediction_screen.classList.remove(`colleague_taxes_prediction${minerno}`);
            run_colleague_ecocrd_prediction_results(colleague_crystalscore, get_prediction(ecocrd_input).toFixed(2), minerno);
        }
    }
    function run_colleague_ecocrd_prediction_results(colleague_crystalscore, ecocrd_prediction, minerno) {
        let colleague_ecocrd = to_pence(get_ecocrd(to_points(colleague_crystalscore)));
        let prediction_points = to_pence(get_ecocrd_prediction_points(to_points(ecocrd_prediction), to_points(colleague_ecocrd)));
        score += prediction_points;
        update_score(score, prediction_points);
        ecocrd_prediction_points.innerHTML = `${prediction_points.toFixed(2)}p`;
        add_results("colleague_ecocrd", prediction_points, colleague_ecocrd, score);
        ecocrd_prediction_results_screen.querySelector("#crystal_score_predresults").innerHTML = colleague_crystalscore.toString();
        ecocrd_prediction_results_screen.querySelector("#tax_payment_predresults").innerHTML =
            (colleague_ecocrd >= 0) ? `+${colleague_ecocrd.toFixed(2)}` : `&minus;${-colleague_ecocrd.toFixed(2)}`;
        ecocrd_prediction_results_screen.classList.add(`colleague_taxes_prediction${minerno}`);
        if (tutorial) {
            ecocrd_prediction_results_screen.querySelector("#whos_taxes").innerHTML = "your colleague’s";
        }
        let total = (colleague_crystalscore + colleague_ecocrd);
        ecocrd_prediction_results_screen.querySelector("#total_predresults").innerHTML =
            (total >= 0) ? `${total.toFixed(2)}` : `&minus;${-total.toFixed(2)}`;
        show_screen(colleague_prediction_screen, ecocrd_prediction_results_screen);

        let continue_button = ecocrd_prediction_results_screen.querySelector("button");
        continue_button.style.display = "none";
        continue_button.onclick = function () {
            ecocrd_prediction_results_screen.classList.remove(`colleague_taxes_prediction${minerno}`);
            trial += 1;
            if (trial < num_trials) {
                run_flight(ecocrd_prediction_results_screen);
            }
            else {
                endfunction(score);
            }
        }
        set_game_timeout(function () {
            continue_button.style.display = "block";
        }, tutorial? 8000 : 2000);
    }
    run_flight(oldscreen);
}

function run_quiz(last_screen) {
    const questions = document.querySelectorAll("#quiz > ol > li");
    let answers = Array(questions.length).fill(0);
    let current = 0;
    let wrong = Array(questions.length).fill(true);
    let attempts = Array(questions.length).fill(0);
    let answered = false;
    let failed_attention = 0;
    let review_instructions = document.getElementById("review-instructions");
    let back_to_quiz_button = document.querySelector("#back-to-quiz button");
    // Find the correct answers, append feedback and the button to the instructions
    for (let i = 0; i < questions.length; i++) {
        let question = questions[i];
        let choices = question.querySelectorAll("li");
        for (let j = 0; j < choices.length; j++) {
            let choice = choices[j];
            if (choice.classList.contains("correct")) {
                answers[i] = j + 1;
            }
        }
        let wrong_feedback = document.createElement("div");
        let right_feedback = document.createElement("div");
        wrong_feedback.classList.add("answer-wrong");
        right_feedback.classList.add("answer-correct");
        wrong_feedback.innerHTML = `Wrong! `;
        let continue_link = document.createElement("span");
        continue_link.classList.add("continue-link");
        continue_link.innerHTML = 'Click here to continue.'
        wrong_feedback.appendChild(continue_link);
        right_feedback.innerHTML = 'Correct!';
        question.appendChild(wrong_feedback);
        question.appendChild(right_feedback);
        let button_instructions = document.createElement("button");
        button_instructions.classList.add("review-instructions");
        button_instructions.innerHTML = "Review the instructions";
        button_instructions.onclick = function() {
            show_screen(question, review_instructions);
            back_to_quiz_button.onclick = function() {
                show_screen(review_instructions, question);
            }
        }
        question.appendChild(button_instructions);
    }
    for (let i = 0; i < questions.length; i++) {
        let question = questions[i];
        for (let answer of question.querySelectorAll("li")) {
            answer.onclick = function () {
                if (answered) return;
                answered = true;
                attempts[current] += 1;
                questions[current].querySelector("button").style.display = "none";
                let answer_correct = answer.classList.contains("correct");
                let correct_option = questions[current].querySelector(".correct");
                let escaped_answer = JSON.stringify(answer.innerHTML);
                if (answer_correct) {
                    correct_option.classList.add("highlight-answer");
                    wrong[current] = false;
                    if (!question.classList.contains("attention_check")) {
                        add_results(`quiz${current}`, 1, escaped_answer, 0);
                    }
                    questions[current].querySelector(".answer-correct").style.display = "block";
                }
                else {
                    questions[current].querySelector(".answer-wrong").style.display = "block";
                    if (question.classList.contains("attention_check")) {
                        failed_attention += 1
                        add_results('failed_attention', 0, failed_attention, 0);
                    }
                    else {
                        add_results(`quiz${current}`, 0, escaped_answer, 0);
                        // Check if failed for the second time, then, if did not failed attention checks, goodbye
                        // if (attempts[current] >= 3 && failed_attention < 2) {
                        //     alert("Thank you for your interest and effort in participating in our study. Unfortunately, you did not meet the required criteria on the comprehension quiz to proceed further. As a result, you will be redirected to Prolific, where you can return your submission by clicking ‘Stop Without Completing’.\nPlease note that you will not receive any payment for this study. However, you will not be penalized with a rejection, and this will not affect your ability to participate in future studies.\nWe appreciate your understanding and cooperation.");
                            
                        //     abort_experiment();
                        // }
                    }
                }
                let foundwrong = false;
                for (let j = current + 1; j < questions.length; j++) {
                    if (wrong[j]) {
                        current = j;
                        foundwrong = true;
                        break;
                    }
                }
                if (!foundwrong) {
                    for (let j = 0; j <= current; j++) {
                        if (wrong[j]) {
                            current = j;
                            foundwrong = true;
                            break;
                        }
                    }
                }
                
                
                if (answer_correct) {
                    set_game_timeout(function() {
                        if (!foundwrong) {
                            run_instructions(
                                questions[i],
                                document.querySelector("#game-instructions"),
                                function(last_page) {
                                    run_trials(last_page, false, show_feedback);
                                });
                        }
                        else {
                            questions[current].querySelector(".answer-correct").style.display = "none";
                            questions[current].querySelector(".answer-wrong").style.display = "none";
                            questions[current].querySelector("button").style.display = "block";
                            answered = false;
                            show_screen(questions[i], questions[current]);
                        }
                    }, 1500);
                }
                else {
                    questions[i].querySelector(".continue-link").onclick = function() {
                        correct_option.classList.remove("highlight-answer");
                        questions[current].querySelector(".answer-correct").style.display = "none";
                        questions[current].querySelector(".answer-wrong").style.display = "none";
                        questions[current].querySelector("button").style.display = "block";
                        answered = false;
                        show_screen(questions[i], questions[current]);
                    }
                }
                
            }
        }
    }
    questions[current].querySelector(".answer-correct").style.display = "none";
    questions[current].querySelector(".answer-wrong").style.display = "none";
    show_screen(last_screen, questions[current]);
}