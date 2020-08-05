import React, {useState, useEffect} from 'react'
import { PitchDetector } from 'pitchy';
import Property from "./Property"
import Script from 'react-load-script'
import {appendScript} from './appendScript'

var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.maxAlternatives = 1;
recognition.interimResults = true;



let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let analyserNode = audioContext.createAnalyser();

class Pitch extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            isActive: false,
            pitch: 0,
            clarity: 0,
            transcript: '',
            showText: true,
            speech_duration: 0,
            showProperties: true,
        }
    }
    componentDidMount(){
        recognition.onstart = function(){
            console.log("stared hearing...")
        }
        recognition.onerror = function(event) {
            console.log("there was an error!")
            // diagnostic.textContent = 'Error occurred in recognition: ' + event.error;
        }
        let finalTranscript = ''

        recognition.onresult =  (event) => {
            // let transcript = event.results[0][0].transcript;
            let interimTranscript = ''
            console.log(event.results)
            for (let i = 0; i < event.results.length; i++) {
                for (let j = 0; j < event.results[i].length; j++){
                    const transcript = event.results[i][j].transcript;
                    // if (event.results[i].isFinal) finalTranscript += transcript + ' ';
                    // else 
                    interimTranscript += transcript;
                }

            }
            // console.log(interimTranscript);
            this.setState({
                transcript: interimTranscript,
            })
        }
    }

    test = ()=>{
        // if (annyang) {
        //     // Let's define a command.
        //     const commands = {
        //         'hello': () => { alert('Hello world!'); }
        //     };
            
        //     // Add our commands to annyang
        //     annyang.addCommands(commands);
            
        //     // Start listening.
        //     // annyang.start();
        // }
    }
    getSpeechRate =()=>{ //returns WPM
        return this.count(this.state.transcript)/this.state.speech_duration * 60
    }
    updatePitch = (analyserNode, detector, input, sampleRate) => {

        analyserNode.getFloatTimeDomainData(input);
        let [p, c] = detector.findPitch(input, sampleRate);
        // console.log("pitch: "+ p);
        // console.log("clarity: "+c);
        this.setState({
            pitch: p,
            clarity: c
        })
    }
    startListening =()=>{
        console.log("listening...")
        recognition.start();
        this.setState({
            isActive: true
        })
        this.createTimer();

    }
    count = (text)=>{ //taken from https://stackoverflow.com/questions/18679576/counting-words-in-string 
        return text.length === 0 ? 0: text.trim().split(/\s+/).length;
    }
    stopListening =()=>{
        // SpeechRecognition.stopListening();
        recognition.stop();
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
    getPitch = ()=>{ //from the example given in https://www.npmjs.com/package/pitchy
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            if (window.streamReference){
                window.streamReference.getAudioTracks().forEach(function(track) {
                    // console.log("stopping track..")
                    track.stop();
                });
            }
            window.streamReference = stream;

            let sourceNode = audioContext.createMediaStreamSource(stream);
            sourceNode.connect(analyserNode);
            const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
            const input = new Float32Array(detector.inputLength);
            this.updatePitch(analyserNode, detector, input, audioContext.sampleRate);
        });
    }
    // const [isActive, setIsActive] = useState(null);    //if continue listening
    // const [pitch, setPitch] = useState(0);
    // const [clarity, setClarity] = useState(0);
    createTimer = ()=>{
        this.timer = setInterval(()=>{
            // this.recognition.onresult =  (event) => {
            //     let transcript = event.results[0][0].transcript;
            //     console.log(transcript);
            // }
            this.setState({
                speech_duration: this.state.speech_duration+1,
            })
            this.getPitch();
        }, 1000);
    }
    toggle =()=>{
        this.setState({
            showText: !this.state.showText
        })
        // setShowText(!showText);
    }
    toggleProperty =()=>{
        this.setState({
            showProperties: !this.state.showProperties,
        })
        // setShowProperties(!showProperties);
    }
    reset= ()=>{
        if (window.streamReference){
            window.streamReference.getAudioTracks().forEach(function(track) {
                console.log("stopping track..")
                track.stop();
            });
        }
        clearInterval(this.timer);

        // resetTranscript();
        recognition.stop();
        this.setState({
            speech_duration: 0,
            restart: true,
            isActive: false,
            clarity: 0,
            pitch: 0,
            transcript: ""
        });
    }
    render(){
        return(
            <div className="app">
                <div className="row">
                    <button onClick={!this.state.isActive ? this.startListening: this.stopListening}  className={`button button-primary button-primary-active`} >{this.state.isActive ? "Stop": this.state.speech_duration === 0 ? "Start": "Continue"}</button>
                    <button onClick={this.reset}  className={`button button-primary button-primary-inactive`}>Reset</button>

                </div>
                <p>Number of words said: <strong>{this.count(this.state.transcript)}</strong></p>
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
                    value = {`${this.state.pitch.toFixed(1)} Hz` }
                    />
                    <Property
                    display_name = "Clarity"
                    value = {this.state.clarity.toFixed(3)}
                    />
                </div>
                }
                <div>
                    <button className="button" onClick={this.toggle}>{this.state.showText ? "Hide text": "Show text"}</button>
                    {
                    this.state.showText && 
                    <p>Transcript: {this.state.transcript}</p>
                    }
                </div>
            </div>
        );
    }
}
export default Pitch