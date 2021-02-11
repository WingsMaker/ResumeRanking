var jd_fid = ''; // the google document ID of the JD
var list_results = [];

function scan_resume(foldername, jd_fid) {  
  var myfolder = DriveApp.getFoldersByName(foldername);
  var folderfound = 1;
  try { var folder = myfolder.next(); }
  catch(err) { folderfound = 0; }
  finally {Logger.clear;}
  if ( folderfound == 0) {
    print("Folder not found")
    return '';
  }  
  var contents = folder.getFiles();
  var file;
  var ftype;
  var name;
  var ranking;
  var item;
  var jd = load_jd(jd_fid);
  txt = '';
  while(contents.hasNext()) {
    file = contents.next();
    fid = file.getId();
    if (fid == jd_fid) {
      continue;
    }
    name = file.getName();    
    ftype = file.getMimeType();
    url = file.getUrl();
    ranking = 0;
    if (ftype == "text/plain") {
      txt = read_txt(fid);

    } else if (ftype == "application/vnd.google-apps.document") {
      txt = read_gdoc(fid);

    } else if (ftype == "application/msword") {
      txt = read_wdoc(fid);

    } else if (ftype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      txt = read_wdoc(fid);
      
    } else if (ftype == "application/pdf") {      
      txt = read_pdf(fid);

    } else {
      txt = "";
    }
    if ( txt != "" ) {
      ranking = checkSimilarity(jd,txt);
    }
    score = Math.round(ranking).toString();
    item = "<tr><td><a href='" + url + "'>" + name + " </a></td><td>" + score + "</td></tr>";
    list_results.push([ranking, item]);    
  }  
  list_results = list_results.sort().reverse();
  list_results = list_results.map(function(x) { return  x[1]; });
  txt = "<br /><table><tr><th>Resumes</th><th>Score</th></tr>";
  txt += list_results.join('');
  txt += "</table>";
  return txt;
}

function load_jd(fid) {  // job description in google doc format, name = jd
  if ( fid.includes('http:') ) {
    fid = fid.split('/').filter(function(x){ return x.includes('_'); })[0]
  }
  return read_gdoc(fid);
}

function read_txt(fid) {
  var txt = DriveApp.getFileById(fid).getBlob().getDataAsString();
  return txt;
}

function read_gdoc(fid) {
  var txt = DocumentApp.openById(fid).getBody().getText();
  return txt;
}

function read_wdoc(fid) {
  var blob = DriveApp.getFileById(fid).getBlob();
  var gdocfile = Drive.Files.insert({}, blob, {convert:true});
  var txt = DocumentApp.openById(gdocfile.id).getBody().getText();
  Drive.Files.remove(gdocfile.id);
  return txt;
}

function read_pdf(fid) {
  var blob = DriveApp.getFileById(fid).getBlob();
  var resource = { title: blob.getName(),mimeType: blob.getContentType()};
  var options = { ocr: true, ocrLanguage: "en" };
  var gdocfile = Drive.Files.insert(resource, blob, options);
  var txt = DocumentApp.openById(gdocfile.id).getBody().getText();
  Drive.Files.remove(gdocfile.id);
  return txt;
}

function print(txt) {
  Logger.log(txt);
}

function wordCountMap(str){
  let words = str.split(' ');
  let wordCount = {};
  words.forEach((w)=>{
    wordCount[w] = (wordCount[w] || 0) +1;
  });
  return wordCount;
}

function addWordsToDictionary(wordCountmap, dict){
  for(let key in wordCountmap){
    dict[key] = true;
  }
}

function wordMapToVector(map,dict){
  let wordCountVector = [];
  for (let term in dict){
    wordCountVector.push(map[term] || 0);
  }
  return wordCountVector;
}

function dotProduct(vecA, vecB){
  let product = 0;
  for(let i=0;i<vecA.length;i++){
    product += vecA[i] * vecB[i];
  }
  return product;
}

function magnitude(vec){
  let sum = 0;
  for (let i = 0;i<vec.length;i++){
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(vecA,vecB){
  return dotProduct(vecA,vecB)/ (magnitude(vecA) * magnitude(vecB));
}

function textCosineSimilarity(txtA,txtB){
  const wordCountA = wordCountMap(txtA);
  const wordCountB = wordCountMap(txtB);
  let dict = {};
  addWordsToDictionary(wordCountA,dict);
  addWordsToDictionary(wordCountB,dict);
  const vectorA = wordMapToVector(wordCountA,dict);
  const vectorB = wordMapToVector(wordCountB,dict);
  return cosineSimilarity(vectorA, vectorB);
}

function getSimilarityScore(val){
  return Math.round(val * 100)
}

function checkSimilarity(text1,text2){
  var similarity = getSimilarityScore(textCosineSimilarity(text1.toLowerCase(),text2.toLowerCase()));
  return similarity;
}

function doGet(e) {
  webpage = HtmlService.createTemplateFromFile("Index").evaluate();
  return webpage;
}

