public class Estudiante extends Persona {
    private String carrera;

    public Estudiante(String nombre, int edad, String carrera) {
        super(nombre, edad);
        this.carrera = carrera;
    }

    @Override
    public void saludar() {
        System.out.println("Hola, soy " + nombre + ", tengo " + edad + " años y soy estudiante de " + carrera + ".");
    }

    public void estudiar() {
        System.out.println(nombre + " estudia " + carrera + ".");
    }
}
