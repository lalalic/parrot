Requirement
===========
> As an english learner, I want to hear each chunk

Features
========
> Daily Topic [1.0]
> Search Topic [1.0]
> Print Topic [1.0]
> Player[1.0]
    > caption: on, off, number to delay some seconds
    > video: on, off
    > speed: 0.5 - 2
    > volume: on, off, number
    > pause: number to pause times of trunk duration
    > record: on, off, rate
        > recognition
    > select: flag current trunk
> Game[1.0]
    > Shadowing
    > Dictating
    > Retelling
> Widgets [2.0]
> Settings [1.0]
    > Policy: Shadowing, Dictating, Retelling
    > Language: En - Zh
> PlanPlayer 


command
=======
> update native code generation : expo prebuild
> ios>pod install : to refresh xcode project files, such as source, podfile, and etc. it should run after every change of new native file, pod spec file

design
======
> remote data (ted, youtube, qili2) => ted store

> Widget defaultProps 

> local state => state.talks[id]

> favorite => local

todo
====
> manage talks on qili

deploy
=====
> build: eas build
> submit: 

AI
==
* chain
    * vocabulary
    * dialog
    * image scenario
    * article
        * make article(chain)
        * split to sentence(code)
        * create audio for sentence(agent)
* chat
* format: word[pronounciation](translation)

UI
===
* red dot: longPress
* green

