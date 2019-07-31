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
