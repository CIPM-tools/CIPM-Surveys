# Survey on Performance Management

<p>Welcome to this survey about performance management. It aims to gather information about the current state of performance management for future research and research directions.</p>

<p>We invite you to participate if you are working in the industry, are involved in software development, and at least 18 years old. The participation is voluntarily, and we treat all data confidental.</p>

<p>The survey takes approximately 15-20 minutes to complete with approximately 20 questions. It consists of two parts of which the following first part is about the current state of performance management.</p>

<p>We appreciate your participation and thank you in advance.</p>

<p>For any matter, you can contact us: [redacted].</p>

## Section: *Demographic Information*

### From which country do you come? \[D1Country\]

(Single choice)

\[196 responses omitted\]

### How old are you? \[D2Age\]

(Single choice)

* 18-25 years old
* 26-35 years old
* 36-45 years old
* 46-55 years old
* 56-65 years old
* Over 65 years old

### How much professional experience do you have? \[D3Experience\]

Professional experience means all time spans in which you worked for a company or organization in the context of software development (i.e., also in different roles).

(Single choice)

* Less than 1 year
* 1-5 years
* 6-10 years
* More than 10 years

### What are your roles in your company? \[D4Roles\]

For the remainder of this survey, we relate the questions to the company and team in which you are currently working.

(Multiple choice)

* Software Developer \[D4a\]
* Software Architect \[D4b\]
* Project Manager \[D4c\]
* Product Owner \[D4d\]
* Scrum Master \[D4e\]
* QA/Test Engineer \[D4f\]
* Other (Free text)

### How large is your company? \[D5CompanySize\]

(Single choice)

* Up to 9 employees
* 10-100 employees
* 101-250 employees
* 250-10,000 employees
* More than 10,000 employees

### How large is your team? \[D6TeamSize\]

(Single choice)

* Up to 5 people
* 6-10 people
* More than 10 people

## Section: *Contextual Information*

### Which of the following software development methods are commonly used in your team? \[C1DevMethod\]

(Multiple choice)

* Sequential development (e.g., Waterfall) \[C1a\]
* Agile development (e.g., Scrum, XP) \[C1b\]
* DevOps \[C1c\]
* Other (Free text)

### Which technologies and methods do you use for development? \[C2Technologies\]

(Multiple choice)

* Cloud Computing (e.g., AWS, Azure) \[C2a\]
* Microservices \[C2b\]
* Container (e.g., Docker, Kubernetes) \[C2c\]
* Big Data (e.g., Apache Hadoop) \[C2d\]
* Technologies for CI/CD \[C2e\]
* Databases \[C2f\]
* Other (Free text)

### How do you currently manage performance in your team? \[C3PManagement\]

<p><em>Monitoring tools</em> take measurements of a software during its runtime in the production environment and allow to analyze the software's performance based on these measurements.</p>

<p><em>Performance tests</em> execute a part or the complete software with different workloads to measure the software's performance.</p>

<p><em>Model-based performance predictions</em> employ a performance model (e.g., a Petri net or UML) which represents a software and describes how resources are used. Based on such a performance model, different techniques predict the performance characteristics of the software.</p>

(Multiple choice)

* By using monitoring tools \[C3PManagement[C3Mon]\]
* By using performance tests \[C3PManagement[C3Tests]\]
* By using model-based performance predictions \[C3PManagement[C3Prediction]\]
* Other (Free text)

### Which reasons hinder you in using monitoring tools? \[C4MonHinder\]

(Only shown if C3PManagement[C3Mon] equals No.)

(Multiple choice)

* Not required \[C4a\]
* Time constraints \[C4b\]
* No expertise in team \[C4c\]
* Never used before \[C4d\]
* No tool support \[C4e\]
* Limited tool support \[C4f\]
* Inaccurate results \[C4g\]
* High costs \[C4h\]
* I don't know what monitoring tools are \[C4i\]
* Other (Free text)

### Which monitoring tools do you currently use? \[C4MonTools\]

(Only shown if C3PManagement[C3Mon] equals Yes.)

(Multiple choice)

* Dynatrace \[C4a\]
* Prometheus \[C4b\]
* Akamai mPulse \[C4c\]
* DataDog \[C4d\]
* GrayLog \[C4e\]
* pyroscope \[C4f\]
* Other (Free text)

### Which reasons hinder you in using performance tests? \[C5TestsHinder\]

(Only shown if C3PManagement[C3Tests] equals No.)

(Multiple choice)

* Not required \[C5a\]
* Time constraints \[C5b\]
* No expertise in team \[C5c\]
* Never used before \[C5d\]
* No tool support \[C5e\]
* Limited tool support \[C5f\]
* Inaccurate results \[C5g\]
* High costs \[C5h\]
* I don't know what performance tests are \[C5i\]
* Other (Free text)

### Which reasons hinder you in using model-based performance predictions? \[C6PredictionHinder\]

(Only shown if C3PManagement[C3Prediction] equals No.)

(Multiple choice)

* Not required \[C6a\]
* Time constraints \[C6b\]
* No expertise in team \[C6c\]
* Never used before \[C6d\]
* No tool support \[C6e\]
* Limited tool support \[C6f\]
* Inaccurate results \[C6g\]
* High costs \[C6h\]
* I don't know what model-based performance predictions are \[C6i\]
* Other (Free text)

### Which tools or techniques do you currently use for performance predictions? \[C6PredictionTools\]

(Only shown if C3PManagement[C3Prediction] equals Yes.)

(Multiple choice)

* Analytical models (e.g., Petri nets) \[C6a\]
* Architecture-based models (e.g., UML or UML Profiles) \[C6b\]
* Machine Learning \[C6c\]
* Spreadsheet \[C6d\]
* Other (Free text)

### For which purposes do you use the performance management tools or tests? \[C7Purpose\]

Performance management tools include monitoring tools and model-based performance prediction tools.

(Multiple choice)

* Improve performance \[C7a\]
* Analyze performance behavior \[C7b\]
* Observe performance over time \[C7c\]
* Evaluate performance for design alternatives \[C7d\]
* Find performance regressions \[C7e\]
* Find performance bottlenecks \[C7f\]
* Fulfill regulations \[C7g\]
* Other (Free text)

### How important is the performance management? Please indicate on a scale from very unimportant to very important. \[C8Relevance\]

(Matrix)

Statements
1. Performance management is important in our company. \[C8a\]
1. Performance management is important in our team. \[C8b\]

Scale
* Very unimportant
* Unimportant
* Neutral
* Important
* Very important

### Do you agree to the following statements? Please indicate on a scale from strongly disagree to strongly agree. \[C9GeneralTrust\]

(Matrix)

Statements
1. I would trust monitoring data from monitoring tools. \[C9a\]
1. I would trust the results of performance tests. \[C9b\]
1. I would trust the results of model-based performance predictions. \[C9c\]

Scale
* Strongly disagree
* Disagree
* Slightly disagree
* Neutral
* Slightly agree
* Agree
* Strongly agree

## Section: *Challenges*

### How satisfied are you with the following quality attributes of the performance management tools that you use? Please indicate on a scale from very unsatisfied to very satisfied. \[Ch1Quality\]

(Matrix)

Statements
1. Accuracy \[Ch1a\]
1. Reliability \[Ch1b\]
1. User-friendliness \[Ch1c\]
1. Performance \[Ch1d\]
1. Effort to apply \[Ch1e\]

Scale
* Very unsatisfied
* Unsatisfied
* Neutral
* Satisfied
* Very satisfied

### Are there any issues or challenges when you use the performance management tools and/or tests? If so, please name them. \[Ch2Challenges\]

(Free text)

### Do you miss features in performance management tools and/or tests? If so, please name them. \[Ch3MissingFeatures\]

(Free text)

### Which of the following features do you want to have in a model-based performance prediction tool? Please indicate on a scale from strongly disagree to strongly agree. \[Ch4PredictionFeature\]

(Matrix)

Statements
1. Support for design decisions (e.g., deployment or system composition) \[Ch4a\]
1. Statements about the prediction accuracy \[Ch4b\]
1. Visualization \[Ch4c\]
1. Support for the software architecture and architectural design \[Ch4d\]
1. Fast feedback \[Ch4e\]

Scale
* Strongly disagree
* Disagree
* Neutral
* Agree
* Strongly agree

## Section: *New Tool*

Welcome to the second part. It consists of four questions about a new model-based performance prediction tool. This tool extracts a performance model from code and monitors the code in a test or production environment. Based on a training set from these measurements, the performance model is calibrated (i.e., its parameters are estimated). Afterwards, the tool performs a self-validation by predicting the performance and comparing the results with a validation set from the measurements. The comparison is based on statistical measures which express the accuracy of the performance prediction. If the prediction is accurate enough, the model can be used to analyze the software system. Otherwise, the monitoring and calibration continues until the self-validation estimates the prediction as sufficiently accurate.

### <p>Do you agree to the following statements? Please indicate on a scale from strongly disagree to strongly agree.</p>

<p> </p>

<p>I would trust the results of model-based performance predictions when...</p> \[N2Trust\]

(Matrix)

Statements
1. metrics about the accuracy of the performance prediction are available. \[N2a\]
1. the calibration of the performance model is based on monitoring data. \[N2b\]
1. the prediction results are validated with monitoring data. \[N2c\]

Scale
* Strongly disagree
* Disagree
* Slightly disagree
* Neutral
* Slightly agree
* Agree
* Strongly agree

## Section: *Costs*

### What factors would you consider when introducing a new performance prediction tool? \[Co1PMFactors\]

(Only shown if D4c equals Yes.)

(Multiple choice)

* Easy setup \[Co1a\]
* Learning curve \[Co1b\]
* Effort to adapt the tool for the team \[Co1c\]
* Possibilities for extensions to the tool \[Co1d\]
* License costs \[Co1e\]
* Setup costs \[Co1f\]
* Maintenance costs \[Co1g\]
* Benefits and Quality \[Co1h\]
* Other (Free text)

### What factors would you consider when adopting a new performance prediction tool? \[Co1DevFactors\]

(Only shown if D4c equals No.)

(Multiple choice)

* Easy setup \[Co1a\]
* Learning curve \[Co1b\]
* Effort to adapt the tool for the team \[Co1c\]
* Possibilities for extensions to the tool \[Co1d\]
* License costs \[Co1e\]
* Setup costs \[Co1f\]
* Maintenance costs \[Co1g\]
* Benefits and Quality \[Co1h\]
* Other (Free text)

### How much overall time would you be willing that people of your team invest in setting up and learning a new performance prediction tool? \[Co2PMTimeLearn\]

(Only shown if D4c equals Yes.)

(Single choice)

* Less than 1 working day
* 1 working day
* 2-3 working days
* 4-5 working days
* 6-10 working days
* More than 10 working days

### How much time would you be willing to invest in setting up and learning a new performance prediction tool? \[Co2DevTimeLearn\]

(Only shown if D4c equals No.)

(Single choice)

* Less than 1 working day
* 1 working day
* 2-3 working days
* 4-5 working days
* 6-10 working days
* More than 10 working days

### If a new performance prediction tool requires adoption to your team's specific technologies and programming languages, how much overall time would you be willing that people of your team invest in this adoption? \[Co3PMTimeAdoption\]

(Only shown if D4c equals Yes.)

(Single choice)

* Less than 1 week
* 1-2 weeks
* 2-3 weeks
* 3-4 weeks
* More than 4 weeks

### If a new performance prediction tool requires adoption to your specific technologies and programming languages, how much time would you be willing to invest in this adoption? \[Co3DevTimeAdoption\]

(Only shown if D4c equals No.)

(Single choice)

* Less than 1 week
* 1-2 weeks
* 2-3 weeks
* 3-4 weeks
* More than 4 weeks

## Closing

<p>Thank you for your participation!</p>

<p>If you are interested in the results of this survey, you can bookmark our Wiki page about the survey where we will provide the results as soon as they are published.</p>

