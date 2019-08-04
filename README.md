This is the protocol code generator

To execute the code make sure you have installed node.js and TypeScript (globally).

To install TypeScript globally:
npm install -g typescript

execute the command 
npm start
in the root of the repository, the application will create three example repositories.

These repositories will be in directories next to the root directory of the location of this repository.
The names of the created repositories are like generatedROLE1ROLE2, where ROLE1 and ROLE2 wille be the roles involved 
in the protocol. (like for example Alice and Bob).

The three created examples are:
1. Alice and Bob
2. Alice, Bob and Fred
3. Colin and Simon, this is the MathSvc example from the paper 'distributed programming using Java API's' from Raymond Hu.

The used scribble syntax is as follows:

1.
module AliceBob;

global protocol AliceBob(role Alice, role Bob) {
    choice {
        Add from Alice to Bob;
        Res from Bob to Alice;
        do AliceBob(Alice, Bob);
    } or {
        Bye from Alice to Bob;
    }
}


2.
module AliceBobFred;

global protocol AliceBobFred(role Alice, role Bob, role Fred) {
    choice {
        Add from Alice to Bob;
        Res from Bob to Alice;
        do AliceBobFred(Alice, Bob, Fred);
    } or {
        Add from Fred to Bob;
        Res from Bob to Fred;
        do AliceBobFred(Alice, Bob, Fred);
    } or {
        Bye from Alice to Bob;
        do Two(Fred, Bob);
    } or {
        Bye from Fred to Bob;
        do Two(Alice, Bob);
    }
}

aux global protocol Two(role Client, role Server) {
    choice {
        Add from Client to Server;
        Res from Server to Client;
        do Two(Client, Server);
    } or {
        Bye from Client to Server;
    }
}



3.
module MathSvc;

global protocol MathSvc(role Colin, role Simon) {
   choice {
      Val from Colin to Simon;
      choice { Add from Colin to Simon;
               Sum from Simon to Colin; 
      } or { Mul from Colin to Simon;
             Prd from Simon to Colin; }
      do MathSvc(Colin,Simon); 
    } or {
        Bye from Colin to Simon;
    }
}

