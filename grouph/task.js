// Settings

const BASE_PAYMENT = 3;
const MAX_BONUS = 4;
const MAX_MINUTES = 45;
const MAX_TIME = `${MAX_MINUTES} minutes`;
const CRYSTAL_CAT = [10,  25, 40, 55, 70];
const TUTORIAL_TRIALS = 5;
const FLIGHT_COST = 100;
const BONUS_NOISE = 30.;
const NUM_TRIALS = 1; // TODO: change this to 50
const POINT_VALUE = 0.001674361;
const URLPARAMS = new URLSearchParams(window.location.search);

var start_time = null;

var results = "time,event,points,input,score\n";

function add_results(event, points, input, score) {
    let text = `${Date.now()},${event},${points},${input},${score}\n`;
    results = results.concat(text);
}

function send_results() {
    document.getElementById("finished").style.display = "block";
    document.getElementById("results").value = results;
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

const bonuscoefs = [79.2857143, -0.0412698413, 0.00626984127, -0.000141975309];

function get_bonus(points) {
    let mean_bonus = 0.;
    let p = 1.;
    for (let i = 0; i < bonuscoefs.length; i++) {
        mean_bonus += bonuscoefs[i]*p;
        p *= points;
    }
    // Special rule for the greedy people
    mean_bonus = Math.max(mean_bonus, -points - 258);
    return Math.round((mean_bonus + randn()*BONUS_NOISE));
}

function get_bonus_prediction_points(prediction, bonus) {
    return Math.round(50*Math.exp(-0.1*Math.abs(prediction - bonus)));
}

window.onload = function() {
    substitute_constants();
    preload_images(
        "/crystalmining/img/astronaut.png",
        "/crystalmining/img/crystals.jpg",
        "/crystalmining/img/planet.png",
        "/crystalmining/img/spaceship.png",
        "/crystalmining/img/ticket.png",
        "/crystalmining/img/page_first.png",
        "/crystalmining/img/page_last.png",
        "/crystalmining/img/page_middle.png",
        "/crystalmining/img/greeting_astronaut.png",
        "/crystalmining/img/sky.png",
        "/crystalmining/img/sky_planet.png",
        "/crystalmining/img/crystal_profit.jpg",
        "/crystalmining/img/arrow_bonus.png",
        "/crystalmining/img/arrow_bonus_prediction.png",
        "/crystalmining/img/arrow_collect.png",
        "/crystalmining/img/arrow_discard.png",
        "/crystalmining/img/arrow_score.png",
        "/crystalmining/img/bonus_prediction_screen.png",
        "/crystalmining/img/bonus_screen.png",
        "/crystalmining/img/boss.png",
        "/crystalmining/img/crystal1.jpg",
        "/crystalmining/img/crystal2.jpg",
        "/crystalmining/img/crystal3.jpg",
        "/crystalmining/img/crystal4.jpg",
        "/crystalmining/img/crystal5.jpg",
        "/crystalmining/img/crystal6.jpg",
        "/crystalmining/img/crystal_collect.png",
        "/crystalmining/img/crystals_points.png",
        "/crystalmining/img/disable.png",
        "/crystalmining/img/space_start.png",
        "/crystalmining/img/spaceship_ticket.png",
    );
    let start_button = document.querySelector("#start-button");
    start_button.innerHTML = "START";
    start_button.removeAttribute("disabled");
    start_button.onclick = function() {
        document.documentElement.requestFullscreen();
    }
    document.onfullscreenchange = start_experiment;
}

var game_maxtime_timeout;

function game_maxtime_exceeded() {
    window.alert(`TIME OUT. You are over ${MAX_TIME}, and your experiment is cancelled.`);
    document.exitFullscreen();
}

function start_experiment() {
    document.body.requestPointerLock();
    document.querySelector("#ethics").remove();
    document.body.className = "running";
    // run_instructions(
    //     null,
    //     document.querySelector("#tutorial-instructions"),
    //     function(last_page) {
    //         run_tutorial(last_page);
    //     });
    // TODO: turn on instructions instead
    run_trials(null, false, show_feedback);
    // show_feedback(100);
    // game_maxtime_timeout = setTimeout(game_maxtime_exceeded, MAX_MINUTES*60*1000);
}

function substitute_constants() {
    for (let span of document.querySelectorAll("span.constant")) {
        if (span.classList.contains("BASE_PAYMENT")) {
            span.append(BASE_PAYMENT.toString());
        }
        else if (span.classList.contains("MAX_PAYMENT")) {
            span.append((BASE_PAYMENT + MAX_BONUS).toString());
        }
        else if (span.classList.contains("MAX_BONUS")) {
            span.append(MAX_BONUS.toString());
        }
        else if (span.classList.contains("MAX_TIME")) {
            span.append(MAX_TIME.toString());
        }
        else if (span.classList.contains("NUM_TRIALS")) {
            span.append(NUM_TRIALS.toString());
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
    let aborted = document.querySelector("#aborted");
    aborted.style.display = "block";
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

function run_instructions(oldscreen, instructions, endfunction) {
    let pages = instructions.children;
    let current_page = 0;
    document.onkeydown = function(event) {
        if (event.key == 'ArrowRight') {
            if (current_page >= 0 && current_page + 1 < pages.length) {
                current_page += 1;
                if (current_page == 1 && !start_time) start_time = Date.now();
                add_results("instructions", 0, "next", 0);
                show_screen(pages[current_page - 1], pages[current_page]);
            }
        }
        else if (event.key == 'ArrowLeft') {
            if (current_page > 0) {
                current_page -= 1;
                add_results("instructions", 0, "previous", 0);
                show_screen(pages[current_page + 1], pages[current_page]);
            }
        }
        else if (event.key == ' ') {
            if (current_page + 1 == pages.length) {
                document.onkeydown = null;
                add_results("instructions", 0, "finish", 0);
                endfunction(pages[current_page]);
            }
        }
    }
    add_results("instructions", 0, null, 0);
    show_screen(oldscreen, pages[current_page]);
}

function get_crystal_points() {
    let val = Math.round(Math.exp(randn()*0.6 + 2.835));
    return (val < 120) ? val : 120;
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
const bonus_prediction_screen = document.querySelector("#bonus_prediction_screen");
const current_bonus_prediction = document.querySelector("#current_bonus_prediction");
const bonus_crystal5_points = document.querySelector("#bonus_crystal5_points");
const bonus_discard_points = document.querySelector("#bonus_discard_points");
const bonus_collect_points = document.querySelector("#bonus_collect_points");
const crystal5info = document.querySelector("#crystal5info");
const bonus_input = document.querySelector("#bonus_prediction input");
const bonus_screen = document.querySelector("#bonus_screen");
const bonus_points = document.querySelector("#bonus_points_text");
const bonus_daily_points = document.querySelector("#bonus_daily_points");
const bonus_prediction_points = document.querySelector("#bonus_prediction_points");
const crystal_tutorial_message = document.querySelector("#crystal_collect .tutorial");
const flight_tutorial_message = document.querySelector("#flightscreen .tutorial");

function update_score(score) {
    for (let scoretext of score_points) {
        scoretext.innerHTML = score.toString();
    }
}

function run_tutorial(oldscreen) {
    run_trials(oldscreen, true, function(score) {
        run_instructions(
            bonus_screen,
            document.querySelector("#game-instructions"),
            function(last_page) {
                run_trials(last_page, false, show_feedback);
            });
    });
}

function finish_experiment() {
    let participant_feedback = document.querySelector("#participant_feedback");
    add_results("feedback", JSON.stringify(participant_feedback.value), null, null);
    document.onkeydown = null;
    document.querySelector("#feedback_screen").style.display = "none";
    document.body.className = "finished";
    send_results();
}

function show_feedback(score) {
    clearTimeout(game_maxtime_timeout);
    let feedback_screen = document.querySelector("#feedback_screen");
    let submit_button = document.querySelector("#submit_feedback");
    let payment_text = document.querySelector("#payment");
    let payment = Math.round(100*(BASE_PAYMENT + score*POINT_VALUE))*0.01;
    if (payment < BASE_PAYMENT)
        payment = BASE_PAYMENT;
    else if (payment > BASE_PAYMENT + MAX_BONUS)
        payment = BASE_PAYMENT + MAX_BONUS;
    payment_text.innerHTML = payment.toFixed(2);
    add_results("payment", payment, null, score);
    document.exitPointerLock();
    show_screen(bonus_screen, feedback_screen);
    document.onfullscreenchange = finish_experiment;
    submit_button.onclick = function() {
        document.exitFullscreen();
    }
}

function run_trials(oldscreen, tutorial, endfunction) {
    let trial = 0;
    let crystal_num;
    let crystal_val;
    let crystal_cat;
    let score = FLIGHT_COST;
    let dailyscore = 0;
    let bonus_predicted;
    let bonus_prediction;
    const num_trials = (tutorial) ? TUTORIAL_TRIALS : NUM_TRIALS;

    if (!tutorial) {
        for (let t of document.querySelectorAll(".tutorial")) {
            t.style.display = "none";
        }
    }

    function run_flight(oldscreen) {
        crystal_num = 1;
        dailyscore = 0;
        score -= FLIGHT_COST;
        bonus_predicted = false;
        update_score(score);
        if (tutorial) flight_tutorial_message.style.display = "none";
        show_screen(oldscreen, flightscreen);
        if (tutorial && trial < 3) {
            set_game_timeout(function() {
                flight_tutorial_message.style.display = "block";
                set_game_timeout(function() {
                    flight_tutorial_message.style.display = "none";
                    set_game_timeout(run_crystals, 1000);
                }, 6000);
            }, 1000);
        }
        else {
            set_game_timeout(run_crystals, 1000);
        }
    }
    function run_crystals() {
        if (crystal_num < 5) {
            crystal_val = get_crystal_points();
            crystal_cat = get_crystal_cat(crystal_val);
            crystalscreen.classList.add(`crystal${crystal_cat}`);
            crystal_num_display.innerHTML = crystal_num.toString();
            crystal_points.innerHTML = crystal_val.toString();
            discard_points.innerHTML = dailyscore.toString();
            collect_points.innerHTML = (dailyscore + crystal_val).toString();
            show_screen(flightscreen, crystalscreen);
        }
        document.onkeydown = function(event) {
            if ((crystal_num < 5 || bonus_predicted) && (event.key == 'ArrowRight' || event.key == 'ArrowLeft')) {
                if (event.key == 'ArrowRight') {
                    score += crystal_val;
                    dailyscore += crystal_val;
                }
                add_results("crystal", crystal_val, event.key == 'ArrowRight' ? "collect" : "discard", score);
                if (crystal_num < 5) {
                    crystal_num += 1;
                    crystal_num_display.innerHTML = crystal_num.toString();
                    crystalscreen.classList.remove(`crystal${crystal_cat}`);
                    crystal_val = get_crystal_points();
                    crystalscreen.classList.remove(`crystal${crystal_cat}`);
                    crystal_cat = get_crystal_cat(crystal_val);
                    crystalscreen.classList.add(`crystal${crystal_cat}`);
                    crystal_num_display.innerHTML = crystal_num.toString();
                    crystal_points.innerHTML = crystal_val.toString();
                    discard_points.innerHTML = dailyscore.toString();
                    collect_points.innerHTML = (dailyscore + crystal_val).toString();
                    update_score(score);
                    if (crystal_num == 5) {
                        crystal5_disable.style.display = "block";
                        if (tutorial) crystal_tutorial_message.style.display = "none";
                    }
                }
                else {
                    crystalscreen.classList.remove(`crystal${crystal_cat}`);
                    document.onkeydown = null;
                    run_bonus_screen();
                }
            }
            else if (crystal_num == 5 && !bonus_predicted && event.key == ' ') {
                // Move to bonus prediction
                crystal5_disable.style.display = "none";
                if (tutorial) crystal_tutorial_message.style.display = "block";
                run_bonus_prediction();
            }
        }
    }
    function run_bonus_prediction() {
        crystal5info.classList.add(`crystal${crystal_cat}`);
        bonus_crystal5_points.innerHTML = crystal_val.toString();
        bonus_discard_points.innerHTML = dailyscore.toString();
        bonus_collect_points.innerHTML = (dailyscore + crystal_val).toString();
        bonus_input.value = Math.trunc(Math.random() * 200 - 100);
        current_bonus_prediction.innerHTML = `${bonus_input.value}`;
        show_screen(crystalscreen, bonus_prediction_screen);
        bonus_input.focus();
        document.onkeydown = function(event) {
            if (event.key == 'ArrowLeft' || event.key == 'ArrowRight') {
                current_bonus_prediction.innerHTML = `${bonus_input.value}`;
            }
            else if (event.key == ' ') {
                bonus_prediction = Number(bonus_input.value);
                bonus_predicted = true;
                crystal5info.classList.remove(`crystal${crystal_cat}`);
                add_results("bonus_prediction", 0, bonus_prediction, score);
                show_screen(bonus_prediction_screen, crystalscreen);
                run_crystals();
            }
        }
    }
    function run_bonus_screen() {
        let bonus = get_bonus(dailyscore);
        let prediction_points = get_bonus_prediction_points(bonus_prediction, bonus);
        score += bonus;
        score += prediction_points;
        update_score(score);
        bonus_daily_points.innerHTML = dailyscore.toString();
        bonus_prediction_points.innerHTML = prediction_points.toString();
        let bonusclass = (bonus >= 0) ? "positive" : "negative";
        bonus_points.classList.add(bonusclass);
        if (bonus >= 0) {
            bonus_points.innerHTML = `+${bonus}`;
        }
        else {
            bonus_points.innerHTML = `${bonus}`;
        }
        add_results("bonus", bonus, null, score);
        add_results("bonus_prediction_points", prediction_points, null, score);
        show_screen(crystalscreen, bonus_screen);
        set_game_timeout(function() {
            trial += 1;
            bonus_points.classList.remove(bonusclass);
            if (trial < num_trials) {
                run_flight(bonus_screen);
            }
            else {
                endfunction(score);
            }
        }, 4500);
    }
    run_flight(oldscreen);
}
