chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type:"getCandidates"}, function(response){
        document.querySelector("#candidate-numbers").innerText = `Candidates extracted: ${response}`;
    });
});
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}
document.querySelector("#save-csv").addEventListener("click", function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type:"getCSV"}, function(response){
            download("hz-linkedin-output.csv", response);
        });
    });
})

document.querySelector("#load-candidates").addEventListener("click", function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type:"loadCandidates"}, function(response){
            alert(response);
        });
    });
})

document.querySelector("#generate-report").addEventListener("click", function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type:"generateReport"}, function(response){
            response[1].forEach(v => {
                download(v[0]+"-inmails-sent.csv", v[1])
                download(v[0]+"-responses.csv", v[0])
            })
            download("hz-summary.csv", response[0])
        });
    });
})