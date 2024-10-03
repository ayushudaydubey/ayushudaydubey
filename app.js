let currentSong = new Audio();  // Global audio object
let songs = [];  // Declare songs globally to be accessible across functions
const play = document.querySelector("#play");  // Select play button by its ID or class
let currFolder;

// Helper function to convert seconds to minutes:seconds format
function secondsToMinutesSeconds(seconds) {
    let minutes = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    if (secs < 10) secs = "0" + secs;  // Add leading zero for single digit seconds
    return `${minutes}:${secs}`;
}

async function getSongs(folder) {
    currFolder = folder;
    let response = await fetch(`http://127.0.0.1:3000/songs/${folder}/`);  // Fetch songs from the specified folder
    let text = await response.text();
    console.log(text);

    let div = document.createElement("div");
    div.innerHTML = text;

    let as = div.getElementsByTagName("a");
    let songList = [];

    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            let songName = decodeURIComponent(element.href.split("/").pop()); // Get only the song name
            songList.push(songName);  // Add the song name to the list
        }
    }
    return songList;
}

const playMusic = (track) => {
    currentSong.src = `http://127.0.0.1:3000/songs/${currFolder}/${track}`;  // Set the audio source using the current folder and selected track
    currentSong.play().catch(error => console.error('Error playing song:', error));  // Catch and log any playback errors
    play.src = "pause.svg";  // Update play button to pause icon

    // Update song info with only the song name
    document.querySelector(".songinfo").innerHTML = `${track}`;
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
};

async function displayAlbums() {
    try {
        let response = await fetch(`http://127.0.0.1:3000/songs/`);  // Fetch song directories
        let text = await response.text();

        let div = document.createElement("div");
        div.innerHTML = text;
        let anchors = div.getElementsByTagName("a");
        let cardContainer = document.querySelector(".cardContainer");

        Array.from(anchors).forEach(async e => {
            if (e.href.includes("/songs")) {
                // Extract folder name properly
                let folder = e.href.split("/").slice(-2)[0];

                // Add check if the folder is valid
                if (folder) {
                    try {
                        let infoResponse = await fetch(`http://127.0.0.1:3000/songs/${folder}/info.json`);

                        // Check if the response is successful
                        if (!infoResponse.ok) {
                            console.log(`Info file not found for folder: ${folder}`);
                            return;  // Skip further processing if file not found
                        }

                        // Parse the JSON response safely
                        let folderInfo = await infoResponse.json();
                        console.log(folderInfo);

                        // Try loading image with different extensions
                        let imagePath = await getImagePath(folder);

                        cardContainer.innerHTML = cardContainer.innerHTML + `
                            <div data-folder="${folder}" class="card">
                                <img src="${imagePath}" alt="">
                                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none"
                                    class="svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img">
                                    <circle cx="12" cy="12" r="10" stroke="green" stroke-width="1.5"></circle>
                                    <path d="M16.5 12L9.5 8V16L16.5 12Z" fill="green"></path>
                                </svg>
                                <h2>${folderInfo.title}</h2>
                              
                            </div>
                        `;

                    } catch (jsonError) {
                        console.error(`Error parsing JSON for folder ${folder}:`, jsonError);
                    }

                    // Add click listeners to each card for loading songs
                    document.querySelectorAll(".card").forEach(item => {
                        item.addEventListener("click", () => {
                            let folder = item.dataset.folder.trim();  // Get the folder name from the clicked item
                            loadSongs(folder);  // Load songs from the corresponding folder
                        });
                    });

                }
            }
        });
    } catch (error) {
        console.error("Error fetching albums:", error);
    }

    document.querySelectorAll(".card").forEach(item => {
        item.addEventListener("click", async () => {
            let folder = item.dataset.folder.trim();  // Get the folder name from the clicked item
            await loadSongs(folder);  // Load songs from the corresponding folder and play the first song
        });
    });
    
}

// Helper function to get the image path based on available file extension
async function getImagePath(folder) {
    const extensions = ["jpg", "jpeg", "png", "gif"];

    for (const ext of extensions) {
        let response = await fetch(`http://127.0.0.1:3000/songs/${folder}`);
        if (response.ok) {
            return `/songs/${folder}/image.${ext}`;  // Return the valid image path
        }
    }

    // If no image found, return a placeholder image path
    return `/songs/default-placeholder.png`;  // Add a default placeholder image
}

displayAlbums();



async function loadSongs(folder) {
    songs = await getSongs(folder);  // Load songs from the selected folder
    let songUL = document.querySelector(".songlist ul");
    songUL.innerHTML = '';  // Clear previous song list

    // Populate the song list in the UI
    for (const song of songs) {
        songUL.innerHTML += `<li>
                                <img class="invert" src="music.svg" alt="">
                                <div class="info">
                                    <div>${song.replaceAll("%20", " ")}</div>
                                    <div class="artist"> </div>
                                </div>
                                <div class="playnow">
                                    <span>Play Now</span><img class="invert" src="play.svg" alt="">
                                </div>
                            </li>`;
    }

    // Attach event listener to each song in the list
    Array.from(document.querySelectorAll(".songlist li")).forEach(e => {
        e.addEventListener("click", () => {
            let songName = e.querySelector(".info").firstElementChild.innerHTML.trim();
            playMusic(songName);  // Play the selected song
        });
    });

    // Automatically play the first song after loading songs
    if (songs.length > 0) {
        playMusic(songs[0]);  // Play the first song in the list
    }
}


document.querySelectorAll(".card").forEach(item => {
    item.addEventListener("click", () => {
        let folder = item.dataset.folder.trim();  // Get the folder name from the clicked item
        loadSongs(folder);  // Load songs from the corresponding folder
    });
});

// Setup event listener for the play/pause button
play.addEventListener("click", () => {
    if (currentSong.paused) {
        currentSong.play();
        play.src = "pause.svg";  // Update button to show pause
    } else {
        currentSong.pause();
        play.src = "play.svg";  // Update button to show play
    }
});

// Listen for timeupdate event on currentSong to update the time
currentSong.addEventListener("timeupdate", () => {
    if (currentSong.duration) {  // Ensure duration is available
        document.querySelector(".songtime").innerHTML =
            `${secondsToMinutesSeconds(currentSong.currentTime)}
         / ${secondsToMinutesSeconds(currentSong.duration)}`;

        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    }
});

// Seekbar event listener
// Time update event listener for the current song to update the time and seekbar
currentSong.addEventListener("timeupdate", () => {
    if (currentSong.duration) {  // Ensure duration is available
        let currentTime = currentSong.currentTime;
        let duration = currentSong.duration;

        // Update the time display
        document.querySelector(".songtime").innerHTML =
            `${secondsToMinutesSeconds(currentTime)} / ${secondsToMinutesSeconds(duration)}`;

        // Update the circle position
        let percent = (currentTime / duration) * 100;
        document.querySelector(".circle").style.left = percent + "%";

        // Change the seekbar's color up to the current progress
        document.querySelector(".seekbar").style.background = `linear-gradient(to right, #05e5f5 ${percent}%, #ccc ${percent}%)`;
    }
});

// Seekbar click event listener to seek through the song
document.querySelector(".seekbar").addEventListener("click", e => {
    let seekbar = e.target.getBoundingClientRect();
    let percent = (e.offsetX / seekbar.width) * 100;

    // Update the circle position
    document.querySelector(".circle").style.left = percent + "%";

    // Update the song's current time based on where the user clicked
    currentSong.currentTime = (currentSong.duration * percent) / 100;

    // Update the seekbar's color
    document.querySelector(".seekbar").style.background = `linear-gradient(to right, #05e5f5 ${percent}%, #ccc ${percent}%)`;
});


// Add event listener to hamburger
document.querySelector(".hamCon").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0";
    document.querySelector(".left").classList.add("open");
    console.log("Hamburger clicked, menu opened.");
    document.querySelector(".X").style.display = "block"; // Show the close button
    document.querySelector(".playbar").style.marginLeft = "100px"; // Adjust the playbar's margin
});

// Ensure that the .X element exists before attaching the event listener
const closeButton = document.querySelector(".X");
if (closeButton) {
    closeButton.addEventListener("click", () => {
        document.querySelector(".left").style.left = "-110%";
        document.querySelector(".left").classList.remove("open");
        document.querySelector(".playbar").style.marginLeft = "0"; // Reset the playbar's margin
        console.log("Close button clicked, menu closed.");
    });
} else {
    console.error("Close button (.X) not found.");
}


// Previous song event listener
let previous = document.querySelector("#previous");
previous.addEventListener("click", () => {
    // Corrected to use slice(-1) to get the last part of the URL
    let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").slice(-1)[0]));

    if (index > 0) {  // If not the first song
        playMusic(songs[index - 1]);  // Play the previous song
    } else {
        playMusic(songs[songs.length - 1]);  // Loop to the last song
    }
});

// Next song event listener
let next = document.querySelector("#next");
next.addEventListener("click", () => {
    // Corrected to use slice(-1) to get the last part of the URL
    let index = songs.indexOf(decodeURIComponent(currentSong.src.split("/").slice(-1)[0]));

    if (index < songs.length - 1) {  // If not the last song
        playMusic(songs[index + 1]);  // Play the next song
    } else {
        playMusic(songs[0]);  // Loop to the first song
    }
});


// Volume control event listener
document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
    currentSong.volume = parseInt(e.target.value) / 100;
});

//for Mute 
document.querySelector(".volume>img").addEventListener("click", e => {
    console.log(e.target);
    console.log("changing " + e.target.src); // Corrected string concatenation

    if (e.target.src.includes("volume.svg")) {
        e.target.src = e.target.src.replace("volume.svg", "mute.svg");
        currentSong.volume = 0; // Mute the volume
        document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
    } else {
        e.target.src = e.target.src.replace("mute.svg", "volume.svg");
        currentSong.volume = 0.9; // Restore the volume to 10%
        document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
    }
});



// Run the main function without autoplay
main();

async function main() {
    // Initially, you can load songs from a default folder if needed
    // songs = await getSongs("defaultFolder");
}
