import React, {useState, useEffect} from 'react'
import { PitchDetector } from 'pitchy';
import Property from "./Property"
import Script from 'react-load-script'

var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.onresult =  function(event){
    var transcript = event.results[0][0].transcript;
    console.log(transcript);
}

let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let analyserNode = audioContext.createAnalyser();
export   Pitch = ()=> {
    if (annyang) {
    // Let's define a command.
    const commands = {
        'hello': () => { alert('Hello world!'); }
    };
    
    // Add our commands to annyang
    annyang.addCommands(commands);
    
    // Start listening.
    // annyang.start();
    }
    function updatePitch(analyserNode, detector, input, sampleRate) {

        analyserNode.getFloatTimeDomainData(input);
        let [p, c] = detector.findPitch(input, sampleRate);
        console.log("pitch: "+ p);
        console.log("clarity: "+c);
        setPitch(p);
        setClarity(c);
        // if (pitch == 0 && p == 0){
        //     setPitch(1);
        // } else if (pitch == 1 && p == 0){
        //     setPitch(0);
        // } else{
        //     setPitch(p);
        //     setClarity(c);
        // }
    }
    function startListening(){
        recognition.start();
        setIsActive(true);
    }
    function stopListening(){
        // console.log(window.streamReference)
        // SpeechRecognition.stopListening();
        recognition.stop();
        setIsActive(false);

        if (window.streamReference) {
            console.log("trying to stop tracks...")
            window.streamReference.getAudioTracks().forEach(function(track) {
                console.log("stopping track..")
                track.stop();
            });
        }   
        // window.streamReference = null;

    }
    function getPitch(){ //from the example given in https://www.npmjs.com/package/pitchy
        // if (!sourceNode){

        
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            // if (isActive){
                if (window.streamReference){
                    window.streamReference.getAudioTracks().forEach(function(track) {
                        console.log("stopping track..")
                        track.stop();
                    });
                }
                window.streamReference = stream;

                let sourceNode = audioContext.createMediaStreamSource(stream);
                sourceNode.connect(analyserNode);
                const detector = PitchDetector.forFloat32Array(analyserNode.fftSize);
                const input = new Float32Array(detector.inputLength);
                updatePitch(analyserNode, detector, input, audioContext.sampleRate);
        });
    }
    const [isActive, setIsActive] = useState(null);    //if continue listening
    const [pitch, setPitch] = useState(0);
    const [clarity, setClarity] = useState(0);
    useEffect(()=>{  //some of this taken from https://upmostly.com/tutorials/build-a-react-timer-component-using-hooks
        console.log("Calling effect...")
        let timer = null;
        if (isActive){ //only update if it's listening
            // console.log("is active")
            timer = setInterval(()=>{
                // setDuration(speech_duration => speech_duration+1); //increase by 1 the number of seconds every second
                // getPitch(); //TODO: What happens if this process takes more than 1 second
            }, 1000)
        }
        return () => {
            clearInterval(timer);
            // stopListening();
        }
    },[isActive])//, speech_duration, restart_timer, transcript, pitch, clarity])

    fuction handleScriptCreate() {
        this.setState({ scriptLoaded: false });
    }
      
    function handleScriptError() {
        this.setState({ scriptError: true })
    }
      
    function handleScriptLoad() {
        this.setState({ scriptLoaded: true })
      
    return(
        <div>
            <Script
            url="https://cdnjs.cloudflare.com/ajax/libs/annyang/2.6.1/annyang.min.js"
            onCreate={this.handleScriptCreate.bind(this)}
            onError={this.handleScriptError.bind(this)}
            onLoad={this.handleScriptLoad.bind(this)}
            />
           <div className="row">
                <button onClick={!isActive ? startListening: stopListening}  className={`button button-primary button-primary-active`} >Start</button>
            </div>
            <Property
            display_name = "Pitch"
            value = {`${pitch.toFixed(1)} Hz` }
            />
            <Property
            display_name = "Clarity"
            value = {clarity.toFixed(3)}
            />
        </div>
    );
}
export default Pitch