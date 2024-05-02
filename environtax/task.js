// Settings

const BASE_PAYMENT = 4.5; // Predicting the experiment will take 45 minutes
const MAX_BONUS = 5.5;
const MAX_MINUTES = 90;
const MAX_TIME = `${MAX_MINUTES} minutes`;
const CRYSTAL_CAT = [10,  25, 40, 55, 70];
const TUTORIAL_TRIALS = 3;
const ENVTAX_NOISE = 10.;
const NUM_TRIALS = 50;
const POINT_VALUE = MAX_BONUS / 1913; // The max number of points (without considering luck) is around 1913
const URLPARAMS = new URLSearchParams(window.location.search);
const MAXCRYSTAL = 300;

var start_time = null;

var results = "time,event,points,value,score\n";

function add_results(event, points, value, score) {
    let text = `${Date.now()},${event},${points},${value},${score}\n`;
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

const envtaxcoefs = [-15.5232772, 0.167360366, -0.00274054077, -0.000139726622, 1.19468684e-06,
    -3.70999034e-09, 4.08332221e-12];
    
function get_envtax(points) {
    let mean_envtax = 0.;
    let p = 1.;
    for (let i = 0; i < envtaxcoefs.length; i++) {
        mean_envtax += envtaxcoefs[i] * p;
        p *= points;
    }
    let tax = Math.round((mean_envtax + randn() * ENVTAX_NOISE));
    if (tax > 0) tax = 0; // The tax cannot be positive
    return tax;
}

function get_envtax_prediction_points(prediction, envtax) {
    return Math.round(10*Math.exp(-0.1*Math.abs(prediction - envtax)));
}

window.onload = function() {
    substitute_constants();
    preload_images(
        "/img/astronaut_small.png",
        "/img/crystals.jpg",
        "/img/planet.png",
        "/img/spaceship.png",
        "/img/ticket.png",
        "/img/page_next.png",
        "/img/page_previous.png",
        "/img/greeting_astronaut.png",
        "/img/sky.png",
        "/img/sky_planet.png",
        "/img/crystal_profit.jpg",
        "/img/arrow_collect.png",
        "/img/arrow_discard.png",
        "/img/arrow_score.png",
        "/img/arrow_bonus.png",
        "/img/arrow_bonus_prediction.png",
        "/img/taxofficer.png",
        "/img/crystal1.jpg",
        "/img/crystal2.jpg",
        "/img/crystal3.jpg",
        "/img/crystal4.jpg",
        "/img/crystal5.jpg",
        "/img/crystal6.jpg",
        "/img/miner1.png",
        "/img/miner2.png",
        "/img/miner3.png",
        "/img/miner4.png",
        "/img/miner5.png",
        "/img/miner6.png",
        "/img/miner7.png",
        "/img/miner8.png",
        "/img/miner9.png",
        "/img/miner10.png",
        "/img/crystal_collect.png",
        "/img/crystal_points.png",
        "/img/crystals_unique.png",
        "/img/disable_mining.png",
        "/img/space_start.png",
        "/img/spaceship_flying.png",
        "/img/zyxlon.jpg",
        "/img/own_tax_prediction.png",
        "/img/crystal5_predict_taxes.png",
        "/img/colleague_tax_prediction.png",
        "/img/own_tax_prediction_results.png",
        "/img/tax_outcome.png",
        "/img/mini_game.png",
        "/img/colleague_tax_prediction_results.png",
        "/img/quiz_correct.png",
        "/img/quiz_incorrect.png",
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
    // run_trials(null, false, show_feedback);
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
    return Math.round(Math.exp(randn()*0.6 + 3.0));
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
const envtax_prediction_screen = document.querySelector("#envtax_prediction_screen");
const envtax_prediction_results_screen = document.querySelector("#envtax_prediction_results");
const colleague_prediction_screen = document.querySelector("#colleague_prediction_screen");
const current_envtax_prediction = document.querySelector("#current_envtax_prediction");
const envtax_crystal5_points = document.querySelector("#envtax_crystal5_points");
const discard = document.querySelector("#discard");
const collect = document.querySelector("#collect");
const envtax_discard_points = document.querySelector("#envtax_discard_points");
const envtax_collect_points = document.querySelector("#envtax_collect_points");
const crystal5info = document.querySelector("#crystal5info");
const envtax_input = document.querySelector("#envtax_prediction input");
const envtax_screen = document.querySelector("#envtax_screen");
const envtax_points = document.querySelector("#envtax_points_text");
const envtax_prediction_points = document.querySelector("#envtax_prediction_points");
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
            envtax_prediction_results_screen,
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
    let payment = Math.round(100*(BASE_PAYMENT + score*POINT_VALUE))*0.01;
    if (payment < BASE_PAYMENT)
        payment = BASE_PAYMENT;
    else if (payment > BASE_PAYMENT + MAX_BONUS)
        payment = BASE_PAYMENT + MAX_BONUS;
    payment_text.innerHTML = payment.toFixed(2);
    add_results("payment", 0, payment, score);
    show_screen(envtax_prediction_results_screen, feedback_screen);
    document.onfullscreenchange = finish_experiment;
    submit_button.onclick = function() {
        document.exitFullscreen();
    }
}

function run_trials(oldscreen, tutorial, endfunction) {
    let trial = 0;
    let crystal_vals = [0, 0, 0, 0, 0];
    let crystal_num;
    let crystal_val;
    let crystal_cat;
    let score = 0;
    let dailyscore = 0;
    let envtax_predicted;
    let envtax_prediction;
    const num_trials = (tutorial) ? TUTORIAL_TRIALS : NUM_TRIALS;

    if (!tutorial) {
        for (let t of document.querySelectorAll(".tutorial")) {
            t.style.display = "none";
        }
    }

    function run_flight(oldscreen) {
        crystal_num = 1;
        dailyscore = 0;
        envtax_predicted = false;
        while (true) {
            for (let i = 0; i < 5; i++) {
                crystal_vals[i] = get_crystal_points();
            }
            let total = crystal_vals.reduce((a, b) => a + b, 0);
            if (total <= MAXCRYSTAL) {
                break;
            }
        }
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
            crystal_val = crystal_vals[crystal_num];
            crystal_cat = get_crystal_cat(crystal_val);
            crystalscreen.classList.add(`crystal${crystal_cat}`);
            crystal_num_display.innerHTML = crystal_num.toString();
            crystal_points.innerHTML = crystal_val.toString();
            discard_points.innerHTML = dailyscore.toString();
            collect_points.innerHTML = (dailyscore + crystal_val).toString();

            show_screen(flightscreen, crystalscreen);
        }
        function advancecrystal() {
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
                run_envtax_screen();
            }
        }
        collect.onclick = function() {
            if (crystal_num < 5 || envtax_predicted) {
                score += crystal_val;
                dailyscore += crystal_val;
                add_results("crystal", crystal_val, "collect", score);
                advancecrystal();
            }
        }
        discard.onclick = function() {
            if (crystal_num < 5 || envtax_predicted) {
                add_results("crystal", crystal_val, "discard", score);
                advancecrystal();
            }
        }
        crystal5_disable.querySelector("button").onclick = function() {
            // Move to envtax prediction
            crystal5_disable.style.display = "none";
            if (tutorial) crystal_tutorial_message.style.display = "block";
            run_own_envtax_prediction();
        }
    }
    function run_own_envtax_prediction() {
        crystal5info.classList.add(`crystal${crystal_cat}`);
        envtax_crystal5_points.innerHTML = crystal_val.toString();
        envtax_discard_points.innerHTML = dailyscore.toString();
        envtax_collect_points.innerHTML = (dailyscore + crystal_val).toString();
        envtax_input.value = Math.trunc(Math.random() * 350);
        current_envtax_prediction.innerHTML = `${envtax_input.value}`;
        show_screen(crystalscreen, envtax_prediction_screen);
        envtax_input.focus();
        let predict_button = envtax_prediction_screen.querySelector(".predict");
        predict_button.setAttribute("disabled", "disabled");
        envtax_input.oninput = function() {
            current_envtax_prediction.innerHTML = `${envtax_input.value}`;
            predict_button.removeAttribute("disabled");
        }
        predict_button.onclick = function() {
            envtax_prediction = -Number(envtax_input.value);
            envtax_predicted = true;
            crystal5info.classList.remove(`crystal${crystal_cat}`);
            add_results("own_envtax_prediction", 0, envtax_prediction, score);
            show_screen(envtax_prediction_screen, crystalscreen);
            run_crystals();
        }
    }
    function run_envtax_screen() {
        let envtax = get_envtax(dailyscore);
        score += envtax;
        update_score(score);
        envtax_points.innerHTML = `${-envtax}`;
        add_results("envtax", envtax, null, score);
        show_screen(crystalscreen, envtax_screen);
        let continue_button = envtax_screen.querySelector("button");
        continue_button.style.display = "none";
        set_game_timeout(function() {
            continue_button.onclick = function() {
                run_own_envtax_prediction_results(envtax);
            }
            continue_button.style.display = "block";
        }, 2000);
    }
    function run_own_envtax_prediction_results(envtax) {
        let prediction_points = get_envtax_prediction_points(envtax_prediction, envtax);
        score += prediction_points;
        update_score(score);
        if (prediction_points != 1)
            envtax_prediction_points.innerHTML = `${prediction_points} points`;
        else
            envtax_prediction_points.innerHTML = '1 point';
        add_results("own_envtax_prediction_points", prediction_points, null, score);
        envtax_prediction_results_screen.querySelector("#crystal_score_predresults").innerHTML = dailyscore.toString();
        envtax_prediction_results_screen.querySelector("#tax_payment_predresults").innerHTML = (-envtax).toString();
        if (tutorial) {
            envtax_prediction_results_screen.querySelector("#whos_taxes").innerHTML = "your";
        }
        let total = (dailyscore + envtax);
        let totalstr;
        if (total >= 0) {
            totalstr = total.toString();
        }
        else {
            totalstr = `&minus;${-total}`;
        }
        envtax_prediction_results_screen.querySelector("#total_predresults").innerHTML = totalstr;
        envtax_prediction_results_screen.classList.add("own_taxes_prediction");
        show_screen(envtax_screen, envtax_prediction_results_screen);
        let continue_button = envtax_prediction_results_screen.querySelector("button");
        continue_button.style.display = "none";
        continue_button.onclick = function() {
            envtax_prediction_results_screen.classList.remove("own_taxes_prediction");
            run_colleague_envtax_prediction();
        }
        set_game_timeout(function() {
            continue_button.style.display = "block";
        }, 2000);
    }
    function run_colleague_envtax_prediction() {
        let colleague_crystalscore;
        do {
            // This gives a reasonable number of points
            colleague_crystalscore = Math.round(40*randn() + 60);
        }
        while (colleague_crystalscore < 0 || colleague_crystalscore > MAXCRYSTAL);
        colleague_prediction_screen.querySelector("#colleague_crystal_score").innerHTML = colleague_crystalscore.toString();
        let taxpredictioninput = colleague_prediction_screen.querySelector("input");
        let taxpredictiondisplay = colleague_prediction_screen.querySelector("#colleague_envtax_prediction");
        let minerno = Math.trunc(Math.random() * 10) + 1;
        colleague_prediction_screen.classList.add(`colleague_taxes_prediction${minerno}`);
        taxpredictioninput.value = Math.trunc(Math.random() * 350);
        taxpredictiondisplay.innerHTML = `${taxpredictioninput.value}`;
        show_screen(envtax_prediction_results_screen, colleague_prediction_screen);
        taxpredictioninput.focus();
        let predict_button = colleague_prediction_screen.querySelector(".predict");
        predict_button.setAttribute("disabled", "disabled");
        taxpredictioninput.oninput = function() {
            taxpredictiondisplay.innerHTML = `${taxpredictioninput.value}`;
            predict_button.removeAttribute("disabled");
        }
        predict_button.onclick = function() {
            add_results("colleague_crystalscore", 0, colleague_crystalscore, score);
            add_results("colleague_envtax_prediction", 0, -Number(taxpredictioninput.value), score);
            colleague_prediction_screen.classList.remove(`colleague_taxes_prediction${minerno}`);
            run_colleague_envtax_prediction_results(colleague_crystalscore, -Number(taxpredictioninput.value), minerno);
        }
    }
    function run_colleague_envtax_prediction_results(colleague_crystalscore, envtax_prediction, minerno) {
        let colleague_envtax = get_envtax(colleague_crystalscore);
        let prediction_points = get_envtax_prediction_points(envtax_prediction, colleague_envtax);
        score += prediction_points;
        update_score(score);
        if (prediction_points != 1)
            envtax_prediction_points.innerHTML = `${prediction_points} points`;
        else
            envtax_prediction_points.innerHTML = '1 point';
        add_results("colleague_envtax", prediction_points, colleague_envtax, score);
        envtax_prediction_results_screen.querySelector("#crystal_score_predresults").innerHTML = colleague_crystalscore.toString();
        envtax_prediction_results_screen.querySelector("#tax_payment_predresults").innerHTML = (-colleague_envtax).toString();
        envtax_prediction_results_screen.classList.add(`colleague_taxes_prediction${minerno}`);
        if (tutorial) {
            envtax_prediction_results_screen.querySelector("#whos_taxes").innerHTML = "your colleague’s";
        }
        let total = (colleague_crystalscore + colleague_envtax);
        let totalstr;
        if (total >= 0) {
            totalstr = total.toString();
        }
        else {
            totalstr = `&minus;${-total}`;
        }
        envtax_prediction_results_screen.querySelector("#total_predresults").innerHTML = totalstr;
        show_screen(colleague_prediction_screen, envtax_prediction_results_screen);
        
        let continue_button = envtax_prediction_results_screen.querySelector("button");
        continue_button.style.display = "none";
        continue_button.onclick = function () {
            envtax_prediction_results_screen.classList.remove(`colleague_taxes_prediction${minerno}`);
            trial += 1;
            if (trial < num_trials) {
                run_flight(envtax_prediction_results_screen);
            }
            else {
                endfunction(score);
            }
        }
        set_game_timeout(function() {
            continue_button.style.display = "block";
        }, 2000);
    }
    run_flight(oldscreen);
}

function run_quiz(last_screen) {
    const questions = document.querySelectorAll("#quiz > ol > li");
    let answers = Array(questions.length).fill(0);
    let current = 0;
    let wrong = Array(questions.length).fill(true);
    let answered = false;
    // Find the correct answers and append feedback
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
        wrong_feedback.innerHTML = `Incorrect! The answer is option ${answers[i]}. `;
        let continue_link = document.createElement("span");
        continue_link.classList.add("continue-link");
        continue_link.innerHTML = 'Click here to continue.'
        wrong_feedback.appendChild(continue_link);
        right_feedback.innerHTML = 'Correct!';
        question.appendChild(wrong_feedback);
        question.appendChild(right_feedback);
    }
    for (let i = 0; i < questions.length; i++) {
        let question = questions[i];
        for (let answer of question.querySelectorAll("li")) {
            answer.onclick = function () {
                if (answered) return;
                answered = true;
                let answer_correct = answer.classList.contains("correct");
                let correct_option = questions[current].querySelector(".correct");
                let escaped_answer = JSON.stringify(answer.innerHTML);
                if (answer_correct) {
                    wrong[current] = false;
                    add_results(`quiz ${current}`, 1, escaped_answer, 0);
                    questions[current].querySelector(".answer-correct").style.display = "block";
                }
                else {
                    questions[current].querySelector(".answer-wrong").style.display = "block";
                    add_results(`quiz ${current}`, 0, escaped_answer, 0);
                }
                correct_option.classList.add("highlight-answer");
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
                if (!foundwrong) {
                    run_instructions(
                        questions[i],
                        document.querySelector("#game-instructions"),
                        function(last_page) {
                            run_trials(last_page, false, show_feedback);
                        });
                }
                else {
                    if (answer_correct) {
                        set_game_timeout(function() {
                            questions[current].querySelector(".answer-correct").style.display = "none";
                            questions[current].querySelector(".answer-wrong").style.display = "none";
                            answered = false;
                            show_screen(questions[i], questions[current]);
                        }, 1500);
                    }
                    else {
                        questions[i].querySelector(".continue-link").onclick = function() {
                            correct_option.classList.remove("highlight-answer");
                            questions[current].querySelector(".answer-correct").style.display = "none";
                            questions[current].querySelector(".answer-wrong").style.display = "none";
                            answered = false;
                            show_screen(questions[i], questions[current]);
                        }
                    }
                }
            }
        }
    }
    questions[current].querySelector(".answer-correct").style.display = "none";
    questions[current].querySelector(".answer-wrong").style.display = "none";
    show_screen(last_screen, questions[current]);
}