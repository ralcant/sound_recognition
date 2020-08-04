import React from 'react';
// import "index.css"

class Property extends React.Component{
    constructor(props){
        super(props);
    }
    render(){
        return(
            <div>
                {this.props.display_name}
                <div className="property">
                <p>{this.props.value}</p>

                </div>
            </div>

        );
    }
}

export default Property;