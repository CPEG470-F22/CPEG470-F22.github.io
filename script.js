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

// hide login container, show register container
$("#create-account").on('click', ()=>{
    $(".register-container")[0].style['display'] = 'flex';
    $(".login-container")[0].style['display'] = 'none';
});

// hide register container, show login container
$("#have-account").on('click', ()=>{
    $(".register-container")[0].style['display'] = 'none';
    $(".login-container")[0].style['display'] = 'flex';
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
            $(".login-container")[0].style['display'] = 'none';
            $(".homepage")[0].style['display'] = 'flex';

            //render all tweets when a user signs in
            loadTweets();
            
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
        content: $('#new-tweet').val(), 
        timestamp: getFormattedDate()
    };

    rtdb.push(tweetsRef, data);
    renderTweet(data);
});

// load and render all tweets 
function loadTweets(){
    let tweetsRef = rtdb.ref(db, `/tweets/`);
    rtdb.get(tweetsRef).then(response=>{ 
        let tweets = response.val();
        for(let tweetID in tweets){
            renderTweet(tweets[tweetID], tweetID);
        }
    });
}

// render an individual tweet
function renderTweet(data, tweetID){
    $('#alltweets').prepend(`
    <div class="tweet">
        <div class="left">
            <img src="https://i.pinimg.com/originals/d9/56/9b/d9569bbed4393e2ceb1af7ba64fdf86a.jpg">
        </div>

        <div class="right">
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
        </div>
    </div>`)
}
