alert("Data extractor has loaded and is now active")

function waitForElm(selector, matchesText, alias) {
    let d = (alias!==undefined) ? ((s) => {return document.querySelectorAll(s)[alias];}):((s)=>document.querySelector(s));
    return new Promise(resolve => {
        if (d(selector)&& d(selector).innerText.includes((matchesText!==undefined)?matchesText:"")) {
            return resolve(d(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (d(selector)&&d(selector).innerText.includes((matchesText!==undefined)?matchesText:"")) {
                resolve(d(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function isVisible(elem) {
    if (!(elem instanceof Element)) throw Error('DomUtil: elem is not an element.');
    const style = getComputedStyle(elem);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (style.opacity < 0.1) return false;
    if (elem.offsetWidth + elem.offsetHeight + elem.getBoundingClientRect().height +
        elem.getBoundingClientRect().width === 0) {
        return false;
    }
    const elemCenter   = {
        x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
        y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
    };
    if (elemCenter.x < 0) return false;
    if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
    if (elemCenter.y < 0) return false;
    if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
    let pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
    do {
        if (pointContainer === elem) return true;
    } while (pointContainer = pointContainer.parentNode);
    return false;
}
function waitUntilDoesntExist(el) {
    return new Promise(resolve => {
        if (document.querySelector(el) == null) {return resolve()}
        const observer = new MutationObserver(i => {
            if (document.querySelector(el) == null) {resolve();observer.disconnect()}
        })
        observer.observe(document.body, {childList:true, subtree:true})
    })
}
var candidates = [];

async function getDataFromCandidatePage() {
    async function gD(x) {
        return (await waitForElm(x)).innerText.trim()
    }
    
    async function currentJob() {
        await waitForElm("[data-test-expandable-list-title]");
        return (document.querySelector("[data-test-grouped-position-entity-company-link]") !== null)
            ? document.querySelector("[data-test-grouped-position-title-link]")
            : document.querySelector("[data-test-position-entity-title]");
    }
    
    // Get profile data
    let profileData = {
        project: (await gD(".pagination-header__header-text")).slice(5),
        company: await gD("[data-test-topcard-condensed-lockup-current-employer]"),
        job: (await currentJob()).innerText,
        location: [...document.querySelectorAll(".artdeco-entity-lockup__content")].filter(isVisible)[0].children[2].children[1].children[0].innerText.slice(1).trim(),
        name: [...document.querySelectorAll('.artdeco-entity-lockup__title')].filter(isVisible)[0].innerText.trim(),
        dateAccessed: new Date().toLocaleString(),
        contacted: "-",
        responded: "-",
        status: "Uncontacted",
        note: "-",
    }

    let messagesTab = (await waitForElm('.navigation-list__item', 'Messages (', 2));
    // let cName = [...document.querySelectorAll('.artdeco-entity-lockup__title')]
    //     .filter(isVisible)[0].innerText.trim();
    // let currentDatetime = new Date().toLocaleString();
    // let contacted = "-";
    // let responded = "-";
    // let status = "Uncontacted";
    let notesTab = (await waitForElm('.note-list__header', 'Notes (', 0))
    // let note = "-";

    if (!(notesTab.innerText.includes("0"))) {
        profileData.note = [...document.querySelector(".notes-expandable-list__list ").querySelectorAll(".note-message")]
            .map(x => x.innerText.trim().replace("\n", " ")).join("\\n");
    }

    if (!(messagesTab.innerText.includes("0"))) {
        messagesTab.click();
        profileData.status = (await gD(".message-state-entity__text"));
        // Click on message-threads
        (await waitForElm(".message-threads-list__list-item--link")).click();
        (await waitForElm(".message-list-entity__date"));
        let inMailDates = document.querySelectorAll(".message-list-entity__date");
        profileData.contacted = inMailDates[0].innerText.trim();
        profileData.responded = (profileData.status == "Accepted")? inMailDates[1].innerText.trim() : "-";
    }

    candidates.push(profileData);
    return profileData;
}

document.addEventListener("keydown", e => {
    e.stopImmediatePropagation();
    if (e.code == "KeyH") {
        getDataFromCandidatePage().then(v => {
            alert(`Saved candidate ${v.name} in project ${v.project}`);
        })
    }
    else if (e.code == "KeyL") {
        let stopwatch = performance.now();
        trackChanges(7).then(n => {
            let t = Math.floor((performance.now() - stopwatch)/1000)
            alert(`Grabbed ${n[0]} profiles from page out of ${n[1]} total profiles in ${t} seconds`);
        })
    }
})

chrome.runtime.onMessage.addListener((m, s, reply) => {
    switch(m.type) {
        case "getCandidates":
            reply(candidates.length);
            break;
        case "getCSV":
            reply(saveCandidatesAsCSV());
            break;
        case "loadCandidates":
            openCandidatesFromPage();
            reply("ok");
            break;
        case "generateReport":
            reply(generateReport());
            break;  
    }
});

function saveCandidatesAsCSV() {
    let csvText = "Name,Status,Contacted,Responded,Company,Location,Note,Project,Date Accessed\n";
    candidates.forEach(c => {
        csvText += `"${c.name}","${c.status}","${c.contacted}","${c.responded}","${c.company}","${c.location}","${c.note}","${c.project}","${c.dateAccessed}"\n`;
    })
    return csvText
}

let projects = {};

function generateReport() {
    let projectArr = [];
    Object.keys(projects).forEach(k => {
        let v = projects[k];
        let contactedCsv = "Name,Contacted,Profile\n"
        v.contacted.forEach(c => {
            contactedCsv += `"${c.name}","${c.contacted.toLocaleString()}","${c.profile}"\n`;
        })
        
        let repliedCsv = "Name,Contacted,Responded,Profile\n"
        v.responses.forEach(r => {
            repliedCsv += `"${r.name}","${r.contacted.toLocaleString()}","${r.responded.toLocaleString()}","${r.profile}"\n`;
        })
        projectArr.push([k, contactedCsv, repliedCsv])
    })
    let summaryCsv = "Project,Inmails Sent,Responses Received\n";
    Object.keys(projects).forEach(k => {
        let v = projects[k];
        summaryCsv += `"${k}","${v.contacted.length}","${v.responses.length}"\n`;
    })
    return [summaryCsv,projectArr];
}

async function trackChanges(timePeriod) {
    let pTitle = document.querySelector(".project-lockup-title__item").innerText;
    let currentProject;
    if (!(pTitle in projects)) { projects[pTitle] = {responses:[], contacted:[]} }
    currentProject = projects[pTitle];
    function getInsideProfile(p) {
        return async function() {
            p.el.querySelector(".artdeco-entity-lockup__title a").click();
            let messagesTab = (await waitForElm('.navigation-list__item', 'Messages (', 2));
            let profileData = {};
            messagesTab.click();
            profileData.status = (await waitForElm(".message-state-entity__text")).innerText.trim();
            // Click on message-threads
            (await waitForElm(".message-threads-list__list-item--link")).click();
            (await waitForElm(".message-list-entity__date"));
            let inMailDates = document.querySelectorAll(".message-list-entity__date");
            profileData.contacted = new Date(inMailDates[0].innerText.trim().replace("at", ""));
            profileData.responded = (profileData.status == "Accepted")? new Date(inMailDates[1].innerText.trim().replace("at", "")) : "-";
            document.querySelector("[data-test-close-pagination-header-button]").click()
            await waitUntilDoesntExist(".pagination-header");
            return {...p, ...profileData}
        }
    }
    let t = (timePeriod!==undefined)?timePeriod:30;
    let furthestDate = new Date(new Date().setDate(new Date().getDate() - t));

    let listOfProfileGettingFuncs = [...document.querySelectorAll(".row")]
        .map(v => {
            return {
                category: v.querySelector(".standard-profile-row__profile-pipeline-status strong").innerText,
                name: v.querySelector(".artdeco-entity-lockup__title").innerText.trim(),
                profile: v.querySelector(".artdeco-entity-lockup__title a").href,
                el: v,
            }
        })
        .filter(v => v.category !== "uncontacted")
        .map(getInsideProfile)
    async function executeSequentially(t) {
        let profiles = [];
        for (const fn of t) {
            let v = await fn();
            profiles.push(v);
        }
        return profiles;
    }
    return executeSequentially(listOfProfileGettingFuncs).then(profiles => {
        let r = profiles.filter(v => v.category == "replied").filter(v => furthestDate < v.responded)
        let c = profiles.filter(v => v.category == "contacted").filter(v => furthestDate < v.contacted)
        currentProject.responses = currentProject.responses.concat(r)
        currentProject.contacted = currentProject.contacted.concat(c)
        console.log("Current project state:", currentProject);
        let numAdded = r.length + c.length;
        if (numAdded == 0) {alert("STOP")};
        return [numAdded, document.querySelectorAll(".row").length];
    });
}
