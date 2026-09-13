public class Main {
    public static void main(String[] args) {
        
        // 1. Creación de los objetos
        Persona est = new Estudiante("Juan", 20, "Quimica");
        Persona prof = new Profesor("Pedro", 45, "Matematica");
        Persona dir = new Director("Carlos", 55, "Ciencias Exactas");

        // 2. Almacenarlos en un arreglo de tipo Persona
        Persona[] personas = { est, prof, dir };

        System.out.println("--- Sistema de Gestión Académica (ITERN) ---");
        System.out.println("____________________");

        // 3. Recorrer el arreglo (Polimorfismo, instanceof y casting)
        for (Persona p : personas) {
            
            // Comportamiento polimórfico: cada objeto llama a su propio método sobreescrito
            p.saludar();

            // Identificar tipo real en tiempo de ejecución
            if (p instanceof Estudiante) {
                Estudiante estudianteReal = (Estudiante) p; // Casting
                estudianteReal.estudiar();
            } else if (p instanceof Director) {
                Director directorReal = (Director) p; // Casting
                directorReal.dirigir();
            }
            
            // Separador idéntico al de los ejemplos de clase
            System.out.println("____________________"); 
        }
    }
}
