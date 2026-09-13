public class Profesor extends Persona {
    private String materia;

    public Profesor(String nombre, int edad, String materia) {
        super(nombre, edad);
        this.materia = materia;
    }

    @Override
    public void saludar() {
        System.out.println("Hola, soy profesor " + nombre + ", imparto " + materia + ".");
    }
}
