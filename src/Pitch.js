import React, {useState, useEffect} from 'react'
// import { PitchDetector } from 'pitchy';
import Property from "./Property"
// import Script from 'react-load-script'
// import {appendScript} from './appendScript'
const Pitchfinder = require("pitchfinder");
const detectPitch = Pitchfinder.AMDF();
var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;



let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let analyserNode = audioContext.createAnalyser();
var MicrophoneStream = require('microphone-stream');

class Pitch extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            isActive: false,
            pitch: 0,
            clarity: 0,
            loudness: 0, 
            final_transcript: "", //the one that is not gonna change
            interim_transcript: "", //the one that can change
            showText: true,
            speech_duration: 0,
            showProperties: true,
            all_pitches: []
        }
    }

    getSpeechRate =()=>{ //returns WPM
        let transcript = this.state.final_transcript +" " +this.state.interim_transcript;
        return this.count(transcript)/this.state.speech_duration * 60
    }
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

        this.recognition.onresult =  (event) => {
            let final_transcript = this.state.final_transcript;
            let interim_transcript = ''
            // console.log(event.results)
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal){
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
    count = (text)=>{ //taken from https://stackoverflow.com/questions/18679576/counting-words-in-string 
        return !text.trim() ? 0: text.trim().split(/\s+/).length;
    }
    stopListening =()=>{
        // SpeechRecognition.stopListening();
        console.log("Pitches have been = " + this.state.all_pitches);
        this.recognition.stop();
        if (this.micStream){
            this.micStream.stop()
            this.micStream = null;
        }
        // setIsActive(false);
        this.setState({
            isActive: false
        })
        clearInterval(this.timer);
        if (window.streamReference) {
            console.log("trying to stop tracks...")
            window.streamReference.getAudioTracks().forEach(function(track) {
                console.log("stopping track..")
                track.stop();
            });
        }  
    }
    recordNewPitch = (pitch)=>{
        let soFar = this.state.all_pitches
        soFar.push(pitch);
        this.setState({
            all_pitches: soFar,
        })
    }
    getPitch = ()=>{ //from the example given in https://www.npmjs.com/package/pitchy
        console.log("getting pitch...")
        this.micStream = new MicrophoneStream();
        let that = this;
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        .then(function(stream) {
            console.log(stream);
          that.micStream.setStream(stream);
        }).catch(function(error) {
          console.log(error);
        });

        this.micStream.on('data', function(chunk) { //chunk is Uint8 array
            // console.log("chunk"+chunk)
            // Optionally convert the Buffer back into a Float32Array
            // (This actually just creates a new DataView - the underlying audio data is not copied or modified.)
            var raw = MicrophoneStream.toRaw(chunk)
            // console.log("raw"+raw);
            /**
             * Getting pitch
             */
            const pitch = detectPitch(raw); // null if pitch cannot be identified

            if (pitch){
                that.recordNewPitch(pitch);
                that.setState({
                    pitch: pitch,
                })
            }

            /**
             * Getting loudness
             */
            that.updateLoudness(raw);

            // note: if you set options.objectMode=true, the `data` event will output AudioBuffers instead of Buffers
          });
        // It also emits a format event with various details (frequency, channels, etc)
        // this.micStream.on('format', function(format) {
        //     console.log(format);
        // });
    }
    updateLoudness = (signal)=>{
        let loud = 0;
        for (let i = 0; i < signal.length; i++){
            loud += signal[i]*signal[i];
        }
        loud /= signal.length;
        loud = Math.sqrt(loud);

        this.setState({
            loudness: loud,
        })

    }
    createTimer = ()=>{
        this.timer = setInterval(()=>{
            this.setState({
                speech_duration: this.state.speech_duration+1,
            })
        }, 1000);
    }
    toggle =()=>{
        this.setState({
            showText: !this.state.showText
        })
    }
    toggleProperty =()=>{
        this.setState({
            showProperties: !this.state.showProperties,
        })
    }
    reset= ()=>{
        console.log("restarting...")
        if (this.micStream){
            this.micStream.stop();
            this.micStream = null;
        }
        // if (window.streamReference){
        //     window.streamReference.getAudioTracks().forEach(function(track) {
        //         console.log("stopping track..")
        //         track.stop();
        //     });
        // }
        this.recognition.stop();
        clearInterval(this.timer);

        // resetTranscript();
        this.setState({
            speech_duration: 0,
            restart: true,
            isActive: false,
            clarity: 0,
            pitch: 0,
            final_transcript: "",
            interim_transcript: "",
        }, ()=>{
            console.log("reset the values!")
        });
    }
    render(){
        let transcript = this.state.final_transcript +" " +this.state.interim_transcript;
        // console.log(this.state);
        return(
            <div className="app">
                <div className="row">
                    <button onClick={!this.state.isActive ? this.startListening: this.stopListening}  className={`button button-primary button-primary-active`} >{this.state.isActive ? "Stop": this.state.speech_duration === 0 ? "Start": "Continue"}</button>
                    <button onClick={this.reset}  className={`button button-primary button-primary-inactive`}>Reset</button>

                </div>
                <p>Number of words said: <strong>{this.count(transcript)}</strong></p>
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
                    display_name = "Loudness"
                    value = {`${this.state.loudness.toFixed(1)}`}
                    />
                    {/* <Property
                    display_name = "Clarity"
                    value = {this.state.clarity.toFixed(3)}
                    /> */}
                </div>
                }
                <div>
                    <button className="button" onClick={this.toggle}>{this.state.showText ? "Hide text": "Show text"}</button>
                    {
                    this.state.showText && 

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
export default Pitch