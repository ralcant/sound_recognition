import React, {useState, useEffect} from 'react'
import Property from "./Property"
import {count, sum} from "./utils"
// import { PitchDetector } from 'pitchy';
// import Script from 'react-load-script'
// import {appendScript} from './appendScript'
const Pitchfinder = require("pitchfinder");
const detectPitch = Pitchfinder.AMDF();
var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
var MicrophoneStream = require('microphone-stream');

// let audioContext = new (window.AudioContext || window.webkitAudioContext)();
// let analyserNode = audioContext.createAnalyser();
class Pitch extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            isActive: false,        //whether the application is receiving sound or not
            pitch: 0,               //current pitch
            clarity: 0,             //current clarity
            intensity: 0,           //current intensity
            final_transcript: "",   //the transcript that is not gonna change
            interim_transcript: "", //the transcript that can change
            showTranscript: true,   //whether to show transcript or not
            speech_duration: 0,     //how long have we been listening
            showProperties: true,   //whether to show the properties (WPM, pitch, intensity)
            all_pitches: [],        //keeps track of all the pitches 
            all_intensities: []     //keeps track of all the intensities
        }
    }
    startListening =()=>{
        this.setupRecognition();
        console.log("listening...")
        this.recognition.start();
        this.setState({
            isActive: true
        })
        this.createTimer();
        this.getPitch();
    }
    /**
     * Create a SpeechRecognition object to keep track of the 
     */
    setupRecognition = ()=>{
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";

        this.recognition.onstart = function(){
            console.log("stared hearing...")
        }
        this.recognition.onerror = function(event) {
            console.log("there was an error: " + event.error)
        }
        this.recognition.onend = function(event){
            console.log("recognition ended!")
        }

        this.recognition.onresult =  (event) => { //from https://developers.google.com/web/updates/2013/01/Voice-Driven-Web-Apps-Introduction-to-the-Web-Speech-API
            let final_transcript = this.state.final_transcript;
            let interim_transcript = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal){ //updating final transcript
                    final_transcript += event.results[i][0].transcript;
                } else{
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            this.setState({
                final_transcript: final_transcript,
                interim_transcript: interim_transcript,
            })
        }
    }
    stopListening =()=>{
        console.log("\nAnalizing pitches:");
        this.printInfoFromArray(this.state.all_pitches);
        console.log("\nAnalizing intensities:");
        this.printInfoFromArray(this.state.all_intensities);

        this.recognition.stop();
        if (this.micStream){
            this.micStream.stop()
            this.micStream = null;
        }
        clearInterval(this.timer);
        this.setState({
            isActive: false
        })
        // if (window.streamReference) { // test to see if this stops the recording button from appearing
        //     console.log("trying to stop tracks...")
        //     window.streamReference.getAudioTracks().forEach(function(track) {
        //         console.log("stopping track..")
        //         track.stop();
        //     });
        // }  
    }
    /**
     * Restart all values
     */
    reset = ()=>{
        console.log("restarting...")
        if (this.micStream){
            this.micStream.stop();
            this.micStream = null;
        }
        this.recognition.stop();
        clearInterval(this.timer);
        this.setState ({
            speech_duration: 0,
            restart: true,
            isActive: false,
            clarity: 0,
            pitch: 0,
            final_transcript: "",
            interim_transcript: "",
            intensity: 0,
        }, ()=>{
            console.log("The values have been reset!")
        });
    }
    /**
     * Gets WPM
     */
    getSpeechRate =()=>{ 
        let transcript = this.state.final_transcript +" " +this.state.interim_transcript;
        return count(transcript)/this.state.speech_duration * 60
    }
    /**
     * Prints the min, max and the mean of an array of numbers
     * @param {*} array 
     */
    printInfoFromArray = (array)=>{
        console.log("Min: "+ Math.min(...array));
        console.log("Max: "+ Math.max(...array)); 
        console.log("Mean: "+ sum(array)/array.length);
    }

    /**
     * Add given pitch to the current array of pitches
     * @param {*} pitch 
     */
    recordNewPitch = (pitch)=>{
        let soFar = this.state.all_pitches
        soFar.push(pitch);
        this.setState({
            all_pitches: soFar,
        })
    }
    /**
     * Add given intensity to the current array of intensities
     * @param {*} intensity 
     */
    recorNewIntensity = (intensity)=>{
        let soFar = this.state.all_intensities;
        soFar.push(intensity);
        this.setState({
            all_intensities: soFar,
        })
    }
    /**
     * Creates a MicrophoneStream and uses getUserMedia to get the pitch and intensity of the given stream.
     */
    getPitch = ()=>{ 
        console.log("getting pitch...")
        this.micStream = new MicrophoneStream();
        let that = this;
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        .then(function(stream) {
            console.log("\n Stream:")
            console.log(stream);
            that.micStream.setStream(stream);
        }).catch(function(error) {
          console.log(error);
        });

        this.micStream.on('data', function(chunk) { //chunk is Uint8 array[8192]
            // Optionally convert the Buffer back into a Float32Array[2048]
            // (This actually just creates a new DataView - the underlying audio data is not copied or modified.)
            var raw = MicrophoneStream.toRaw(chunk)
            /**
             * Getting pitch
             */
            const pitch = detectPitch(raw); // null if pitch cannot be identified

            if (pitch){
                that.recordNewPitch(pitch);
                that.setState({
                    pitch: pitch,
                });
            }
            that.updateIntensity(raw);
          });
    }
    /**
     * Gets the RMS of an incoming signal and records to our array of intensities
     * @param {*} signal 
     */
    updateIntensity = (signal)=>{
        let loud = 0;
        for (let i = 0; i < signal.length; i++){
            loud += signal[i]*signal[i];
        }
        let intensity = Math.sqrt(loud/signal.length);
        this.setState({
            intensity: intensity,
        })
        this.recorNewIntensity(intensity);
    }
    /**
     * Creating a timer to keep track of how long it's been recording.
     */
    createTimer = ()=>{
        this.timer = setInterval(()=>{
            this.setState({
                speech_duration: this.state.speech_duration+1,
            })
        }, 1000);
    }
    /**
     * To show (hide) the transcript
     */
    toggle =()=>{
        this.setState({
            showTranscript: !this.state.showTranscript
        })
    }
    /**
     * To show (hide) the audio properties
     */
    toggleProperty =()=>{
        this.setState({
            showProperties: !this.state.showProperties,
        })
    }
    render(){
        let transcript = this.state.final_transcript +" " +this.state.interim_transcript;
        return(
            <div className="app">
                <div className="row">
                    <button onClick={!this.state.isActive ? this.startListening: this.stopListening}  className={`button button-primary button-primary-active`} >{this.state.isActive ? "Stop": this.state.speech_duration === 0 ? "Start": "Continue"}</button>
                    <button onClick={this.reset}  className={`button button-primary button-primary-inactive`}>Reset</button>
                </div>
                <p>Number of words said: <strong>{count(transcript)}</strong></p>
                <p>Duration: {this.state.speech_duration}s</p>
                <button className="button" onClick={this.toggleProperty}>{this.state.showProperties ? "Hide properties" : "Show properties"}</button>
                {
                this.state.showProperties &&
                <div className="properties">
                    <Property
                    display_name = "WPM"
                    value = {this.getSpeechRate().toFixed(2)}
                    />
                    <Property
                    display_name = "Pitch"
                    value = {`${this.state.pitch.toFixed(1)} Hz`}
                    />
                    <Property
                    display_name = "Intensity"
                    value = {`${this.state.intensity.toFixed(2)}`}
                    />
                </div>
                }
                <div>
                    <button className="button" onClick={this.toggle}>{this.state.showTranscript ? "Hide text": "Show text"}</button>
                    {
                    this.state.showTranscript && 

                    <p>Transcript: 
                        <span>
                            <strong>{this.state.final_transcript + " "}</strong>
                        </span>
                        <span>{this.state.interim_transcript}</span>
                    </p>
                    }
                </div>
            </div>
        );
    }
}
export default Pitch;