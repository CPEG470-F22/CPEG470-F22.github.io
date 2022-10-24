// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.4/firebase-app.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.9.4/firebase-database.js"
import * as fbauth from "https://www.gstatic.com/firebasejs/9.9.4/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAo5sWZZdImYhjLx8qLlbGVREpSflNyWTs",
    authDomain: "mocktwitter-fe7bd.firebaseapp.com",
    projectId: "mocktwitter-fe7bd",
    storageBucket: "mocktwitter-fe7bd.appspot.com",
    messagingSenderId: "912146988547",
    appId: "1:912146988547:web:a62a9d1b87c9ae583e9836",
    measurementId: "G-SCKE3VS55X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let db = rtdb.getDatabase(app);
let auth = fbauth.getAuth(app);


var firstname;
var lastname;
var handle;
var UID;

//returns formatted date for tweet timestamp
let getFormattedDate = function(){
    var d = new Date();
    d = d.getFullYear() + "-" + ('0' + (d.getMonth() + 1)).slice(-2) + "-" + ('0' + d.getDate()).slice(-2) + " " + ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);
    return d;
}

function showRegister(){
    $(".register-container")[0].style['display'] = 'flex';
    $(".login-container")[0].style['display'] = 'none';
    $(".homepage")[0].style['display'] = 'none';
}

function showLogin(){
    $(".register-container")[0].style['display'] = 'none';
    $(".login-container")[0].style['display'] = 'flex';
    $(".homepage")[0].style['display'] = 'none';
}

function showHome(){
    $(".register-container")[0].style['display'] = 'none';
    $(".login-container")[0].style['display'] = 'none';
    $(".homepage")[0].style['display'] = 'flex';
    loadTweets();
}

// hide login container, show register container
$("#create-account").on('click', ()=>{
    window.location = location.protocol + "//" + location.hostname + ':' + location.port + "/register";
    //showRegister();
});

// hide register container, show login container
$("#have-account").on('click', ()=>{
    window.location = location.protocol + "//" + location.hostname + ':' + location.port + "/login";
    //showLogin();
});

//log in a user that already exists
$("#signin").on("click", ()=>{
    let user = $(".login-container #handle-email").val();
    let pwd = $(".login-container #password").val();

    //user can sign in with email or handle
    if (user.includes("@")){
        signIn(auth, user, pwd);  
    } else {
        rtdb.get(rtdb.ref(db, `/usernames/${user}/`)).then(
            response=>{
                signIn(auth, response.val().email, pwd);
            }).catch(function(error) {    });
    }
});

function signIn(auth, email, pwd){
    fbauth.signInWithEmailAndPassword(auth, email, pwd).then(
        response=>{
            console.log(response.user);
            UID = response.user.uid;
            
            //set user to be online
            let userRef = rtdb.ref(db, `/users/${UID}`);
            rtdb.update(userRef, {online: true});
            //get the handle, firstname, and lastname
            rtdb.get(userRef).then(response=>{ 
                let data=response.val();
                handle = data['basic-info'].handle;
                firstname = data['basic-info'].firstname;
                lastname = data['basic-info'].lastname;
            });

            // hide login container, show homepage    
            window.location = location.protocol + "//" + location.hostname + ':' + location.port + "/home";
            //showHome();

            //render all tweets when a user signs in
            
            
        }).catch(function(error) {    });
}

// register a new user
$("#register").on("click", ()=>{
    let email = $(".register-container #email").val();
    let password = $(".register-container #password").val();
    let confirmPassword = $(".register-container #confirm-password").val();
    
    if (password != confirmPassword){
      alert("Passwords don't match");
      return;
    }
    
    //check if the handle already exists
    handle = $('.register-container #handle').val();
    let usernamesRef = rtdb.ref(db, `/usernames/${handle}`);
    rtdb.get(usernamesRef).then(response=>{ 
        if(response.val() != null){
            // user with this handle already exists
            alert("Username taken");
        } else {
            // create a new user
            fbauth.createUserWithEmailAndPassword(auth, email, password).then(response=>{
                UID = response.user.uid;
                firstname = $('.register-container #firstname').val()
                lastname = $('.register-container #lastname').val()

                //create the user object
                let userRef = rtdb.ref(db, `/users/${UID}`);
                let data = {"basic-info": {
                                "handle": handle,
                                "firstname": firstname,
                                "lastname": lastname,
                                "email": email
                            },
                            "online": true,
                            "roles": {
                                "user": true
                            }
                };
                rtdb.set(userRef, data);

                // add username to list of usernames
                let usernamesRef = rtdb.ref(db, `/usernames/${handle}`);
                data = {
                        "uuid": UID,
                        "email": $('.register-container #email').val()
                    };
                rtdb.set(usernamesRef, data);

                // hide register container, show homepage
                $(".register-container")[0].style['display'] = 'none';
                $(".homepage")[0].style['display'] = 'flex';

                loadTweets();
            
            }).catch(function(error) { console.log(error)});
        }
    });
});

// send a tweet
$("#send-tweet").on("click", ()=>{
    let tweetsRef = rtdb.ref(db, "/tweets/");
    let data = {
        author: {
            handle: handle,
            firstname: firstname,
            lastname: lastname 
        },
        retweets: 0,
        content: $('#new-tweet').val(), 
        timestamp: getFormattedDate()
    };

    rtdb.push(tweetsRef, data).then((response)=>{
        renderTweet(data, response.key);
    });
});

// load and render all tweets 
function loadTweets(){
    let tweetsRef = rtdb.ref(db, `/tweets/`);
    rtdb.get(tweetsRef).then(response=>{ 
        let tweets = response.val();
        for(let tweetID in tweets){
            renderTweet(tweets[tweetID], tweetID);
            // add buttons listeners
            likesListener(tweetID);
            //retweetsListener(tweetID);
        }
    });
}

function likesListener(tweetID){
    $(`#${tweetID} #like`).on('click', (event)=>{
        let tweetLikesRef = rtdb.ref(db, `/tweets/${tweetID}/likes`);
        rtdb.get(tweetLikesRef).then(response=>{
            let data = response.val();
            // tweet currently has 0 likes, first person to like 
            if (data == null){
                rtdb.update(tweetLikesRef, { [UID] : true });
                event.currentTarget.childNodes[2].data = 1;
            } else {
                // likes is not an empty object
                let likes = Object.keys(data).length;
                // am i liking or unliking the message?
                if(Object.keys(data).includes(UID)){
                    //if I have previously liked the message - remove like
                    rtdb.update(tweetLikesRef, { [UID] : null });
                    event.currentTarget.childNodes[2].data = likes - 1;
                } else {
                    //not currently in liked list - add like
                    rtdb.update(tweetLikesRef, { [UID] : true });
                    event.currentTarget.childNodes[2].data = likes + 1;
                }
            }
        });
    });
}


// function retweetsListener(tweetID){
//     $(`#${tweetID} #retweet`).on('click', (event)=>{
//         let tweetRetweetsRef = rtdb.ref(db, `/tweets/${tweetID}/retweets`);
//         rtdb.get(tweetRetweetsRef).then(response=>{
//             let rtCount = response.val();

//             // increase retweet count, update view + update database
//             rtCount += 1; 
//             event.currentTarget.childNodes[2].data = rtCount;
//             rtdb.update(tweetRetweetsRef.parent, {'retweets': rtCount});

//             // retweet the tweet
//             // rtdb.get(tweetRetweetsRef.parent).then((response)=>{
//             //     let tweet = response.val();
//             //     tweet['retweeter'] = handle;
//             // });

//         });
//     });
// }


// render an individual tweet
function renderTweet(data, tweetID){
    $('#alltweets').prepend(`
    <div class="tweet card" id=${tweetID}>
        <img src="https://i.pinimg.com/originals/d9/56/9b/d9569bbed4393e2ceb1af7ba64fdf86a.jpg">

        <div class="card-body right">
            <div class="top" style="display: flex;">
                <p id="user-name">${data.author.firstname} ${data.author.lastname}</p>

                <div class="extra-info">
                    <p id="user-handle">@${data.author.handle}</p>
                    <p class="buffer-character">·</p>
                    <p id="timestamp">${data.timestamp}</p>
                </div>
                
            </div>
            <div class="body" style="display: flex;">
                <p>${data.content}</p>
            </div>
            <div class="bottom-buttons row" style="display: flex;">
                <div class="col-3"> 
                    <button class="btn btn-primary disabled" id="comment"> <i class="fa fa-comment"></i>${data.comments ? Object.keys(data.comments).length : 0}</button>
                </div>
                <div class="col-3"> 
                    <button class="btn btn-primary" id="like"> <i class="fa fa-heart"></i>${data.likes ? Object.keys(data.likes).length : 0}</button> 
                </div>
                <div class="col-3"> 
                    <button class="btn btn-primary disabled" id="retweet"> <i class="fa fa-retweet"></i>${data.retweets ? Object.keys(data.retweets).length : 0}</button> 
                </div>
                <div class="col-3"> 
                    <button class="btn btn-primary disabled" id="share"> <i class="fa fa-share"></i>${data.shares ? Object.keys(data.shares).length : 0}</button> 
                </div>
            </div>
        </div>
    </div>`)

    $("#alltweets .tweet").hover((event)=>{
        event.currentTarget.classList.add('card-header');
    }, (event)=>{
        event.currentTarget.classList.remove('card-header');
    }, );
}


$(document).ready(function(){
    //STEP 1: given any URL determine if it is one the "routes" I want to honor
    //Home page
    //User Profile
    //Forum Topic
    let paths = document.location.pathname.split("/");
    let subapp = paths[1];
    switch (subapp){
      case "register":
        showRegister();
        break;
      case "login":
        showLogin();
        break;
      case "home":
        // check if user is signed in first
        showHome();
        break;
      default:
        // default to login page
        showLogin();
        // document.location.pathname = '/login';
    }

  });


