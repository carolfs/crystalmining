// Settings

const BASE_PAYMENT = 4; // Predicting the experiment will take 40 minutes
const MAX_BONUS = 3;
const CRYSTAL_CAT = [10,  25, 40, 55, 70];
const TUTORIAL_TRIALS = 2*2;
const INIT_TUTORIAL_SCORE = 1000;
const ECOCRD_NOISE = 10.;
const NUM_TRIALS = 50*2;
const POINT_VALUE = (BASE_PAYMENT + MAX_BONUS) / 10802; // The max number of points (without considering luck) is around this number
const URLPARAMS = new URLSearchParams(window.location.search);
const PROLIFIC_PID = URLPARAMS.get("PROLIFIC_PID");
const COMPLETION_CODE = "C14AAQXM";
const PROLIFIC_COMPLETE = `https://app.prolific.com/submissions/complete?cc=${COMPLETION_CODE}`;
const PROLIFIC_ABORT = "https://app.prolific.com/submissions/complete?cc=NOCODE";
const DATA_URL = "/savedata";
const MAXCRYSTAL = 200;

var tutorial_instructions = document.getElementById("tutorial-instructions").querySelectorAll("p");
var review_instructions = document.getElementById("review-instructions");
tutorial_instructions.forEach(element => {
    review_instructions.appendChild(element.cloneNode(true));
});


var start_time = null;

var results = "time,event,points,value,score\n";

// Crystal score - Ecocredits pairs separated by a comma
var sc_eco_pairs;

function add_results(event, points, value, score) {
    let text = `${Date.now()},${event},${points},${value},${score}\n`;
    results = results.concat(text);
}

function send_results() {
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
    let ecocrd = Math.round((mean_ecocrd + randn() * ECOCRD_NOISE));
    return ecocrd;
}

function get_ecocrd_prediction_points(prediction, ecocrd) {
    return Math.round(10*Math.exp(-0.05*Math.abs(prediction - ecocrd)));
}

window.onload = function() {
    // if ((!PROLIFIC_PID || PROLIFIC_PID.length === 0 )) {
    //     window.alert("ERROR: Prolific ID missing from URL. Please verify the URL on Prolific’s website.");
    //     return;
    // }
    // add_results("PROLIFIC_PID", 0, PROLIFIC_PID, 0);
    substitute_constants();
    preload_images(
        "/crystalmining/betting/img/astronaut_small.png",
        "/crystalmining/betting/img/crystals.jpg",
        "/crystalmining/betting/img/planet.png",
        "/crystalmining/betting/img/spaceship.png",
        "/crystalmining/betting/img/ticket.png",
        "/crystalmining/betting/img/page_next.png",
        "/crystalmining/betting/img/page_previous.png",
        "/crystalmining/betting/img/greeting_astronaut.png",
        "/crystalmining/betting/img/sky.png",
        "/crystalmining/betting/img/sky_planet.png",
        "/crystalmining/betting/img/crystal_profit.jpg",
        "/crystalmining/betting/img/arrow_collect.png",
        "/crystalmining/betting/img/arrow_discard.png",
        "/crystalmining/betting/img/arrow_score.png",
        "/crystalmining/betting/img/arrow_bonus.png",
        "/crystalmining/betting/img/arrow_bonus_prediction.png",
        "/crystalmining/betting/img/auditor.png",
        "/crystalmining/betting/img/crystal1.jpg",
        "/crystalmining/betting/img/crystal2.jpg",
        "/crystalmining/betting/img/crystal3.jpg",
        "/crystalmining/betting/img/crystal4.jpg",
        "/crystalmining/betting/img/crystal5.jpg",
        "/crystalmining/betting/img/crystal6.jpg",
        "/crystalmining/betting/img/miner1.png",
        "/crystalmining/betting/img/miner2.png",
        "/crystalmining/betting/img/miner3.png",
        "/crystalmining/betting/img/miner4.png",
        "/crystalmining/betting/img/miner5.png",
        "/crystalmining/betting/img/miner6.png",
        "/crystalmining/betting/img/miner7.png",
        "/crystalmining/betting/img/miner8.png",
        "/crystalmining/betting/img/miner9.png",
        "/crystalmining/betting/img/miner10.png",
        "/crystalmining/betting/img/crystal_collect.png",
        "/crystalmining/betting/img/crystal_points.png",
        "/crystalmining/betting/img/crystals_unique.png",
        "/crystalmining/betting/img/disable_mining.png",
        "/crystalmining/betting/img/space_start.png",
        "/crystalmining/betting/img/spaceship_flying.png",
        "/crystalmining/betting/img/zyxlon.jpg",
        "/crystalmining/betting/img/own_prediction.png",
        "/crystalmining/betting/img/crystal5_predict.png",
        "/crystalmining/betting/img/colleague_prediction.png",
        "/crystalmining/betting/img/own_prediction_results.png",
        "/crystalmining/betting/img/ecocrd.png",
        "/crystalmining/betting/img/mini_game.png",
        "/crystalmining/betting/img/colleague_prediction_results.png",
        "/crystalmining/betting/img/quiz_correct.png",
        "/crystalmining/betting/img/quiz_incorrect.png",
    );
    let start_button = document.querySelector("#start-button");
    start_button.innerHTML = "START THE EXPERIMENT";
    start_button.removeAttribute("disabled");
    start_button.onclick = function() {
        const textarea = document.getElementById("inputdata");
        const text = textarea.value.trim();
        const lines = text.split('\n');
        sc_eco_pairs = lines.map(line => {
            const values = line.split(/,/).map(item => item.trim());
            return values.map(value => parseInt(value, 10));
        });
        
        if (sc_eco_pairs.length != NUM_TRIALS + TUTORIAL_TRIALS) {
            window.console.log(sc_eco_pairs.toString());
            window.alert(`Wrong amount of data: ${sc_eco_pairs.length} rather than ${NUM_TRIALS + TUTORIAL_TRIALS}`)
        }
        else {
            document.documentElement.requestFullscreen();
        }
    }
    document.onfullscreenchange = start_experiment;
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
        else if (span.classList.contains("POINTS_WORTH")) {
            span.append((Math.round(10000*POINT_VALUE)/100).toFixed(2));
        }
        else if (span.classList.contains("INIT_TUTORIAL_SCORE")) {
            span.append(INIT_TUTORIAL_SCORE.toString());
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
    return Math.round(Math.exp(randn()*0.8 + 3.2));
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

function update_score(score) {
    for (let scoretext of score_points) {
        scoretext.innerHTML = score.toString();
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
    let payment = Math.round(score);
    payment_text.innerHTML = payment.toString();
    add_results("payment", 0, payment, score);
    show_screen(ecocrd_prediction_results_screen, feedback_screen);
    document.onfullscreenchange = finish_experiment;
    submit_button.onclick = function() {
        document.exitFullscreen();
    }
}

function run_trials(oldscreen, tutorial, endfunction) {
    let trial = 0;
    let score = tutorial? INIT_TUTORIAL_SCORE : 0;
    const num_trials = (tutorial) ? TUTORIAL_TRIALS : NUM_TRIALS;
    update_score(score);

    if (!tutorial) {
        for (let t of document.querySelectorAll(".tutorial")) {
            t.style.display = "none";
        }
    }

    function run_colleague_ecocrd_prediction(oldscreen) {
        let trial_pair = sc_eco_pairs.shift();
        let [colleague_crystalscore, colleague_ecocrd] = trial_pair;
        colleague_prediction_screen.querySelector("#colleague_crystal_score").innerHTML = colleague_crystalscore.toString();
        let ecocrd_input = colleague_prediction_screen.querySelector("input");
        let current_ecocrd_prediction = colleague_prediction_screen.querySelector("#colleague_ecocrd_prediction");
        let minerno = Math.trunc(Math.random() * 10) + 1;
        colleague_prediction_screen.classList.add(`colleague_taxes_prediction${minerno}`);
        ecocrd_input.value = Math.trunc(Math.random() * (ecocrd_input.max - ecocrd_input.min)) + ecocrd_input.min;
        current_ecocrd_prediction.innerHTML = `${ecocrd_input.value}`;
        show_screen(oldscreen, colleague_prediction_screen);
        ecocrd_input.focus();
        
        let prediction_changed = 0;
        ecocrd_input.oninput = function() {
            current_ecocrd_prediction.innerHTML = `${ecocrd_input.value}`;
            prediction_changed = 1;
        }
        colleague_prediction_screen.querySelector(".predict").onclick = function() {
            add_results("colleague_crystalscore", 0, colleague_crystalscore, score);
            add_results("colleague_ecocrd_prediction", 0, Number(ecocrd_input.value), score);
            add_results("colleague_ecocrd_prediction_changed", 0, prediction_changed, score);
            colleague_prediction_screen.classList.remove(`colleague_taxes_prediction${minerno}`);
            run_colleague_ecocrd_prediction_results(colleague_crystalscore, colleague_ecocrd, Number(ecocrd_input.value), minerno);
        }
    }
    function run_colleague_ecocrd_prediction_results(colleague_crystalscore, colleague_ecocrd, ecocrd_prediction, minerno) {
        let prediction_points = get_ecocrd_prediction_points(ecocrd_prediction, colleague_ecocrd);
        score += prediction_points;
        update_score(score);
        if (prediction_points != 1)
            ecocrd_prediction_points.innerHTML = `${prediction_points} points`;
        else
            ecocrd_prediction_points.innerHTML = '1 point';
        add_results("colleague_ecocrd", prediction_points, colleague_ecocrd, score);
        ecocrd_prediction_results_screen.querySelector("#crystal_score_predresults").innerHTML = colleague_crystalscore.toString();
        ecocrd_prediction_results_screen.querySelector("#tax_payment_predresults").innerHTML =
            (colleague_ecocrd >= 0) ? `+${colleague_ecocrd}` : `&minus;${-colleague_ecocrd}`;
        ecocrd_prediction_results_screen.classList.add(`colleague_taxes_prediction${minerno}`);
        show_screen(colleague_prediction_screen, ecocrd_prediction_results_screen);

        let continue_button = ecocrd_prediction_results_screen.querySelector("button");
        continue_button.style.display = "none";
        continue_button.onclick = function () {
            ecocrd_prediction_results_screen.classList.remove(`colleague_taxes_prediction${minerno}`);
            trial += 1;
            if (trial < num_trials) {
                run_colleague_ecocrd_prediction(ecocrd_prediction_results_screen);
            }
            else {
                endfunction(score);
            }
        }
        set_game_timeout(function () {
            continue_button.style.display = "block";
        }, 2000);
    }
    run_colleague_ecocrd_prediction(oldscreen);
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