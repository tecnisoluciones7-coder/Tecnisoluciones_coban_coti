public class Director extends Persona {
    private String departamento;

    public Director(String nombre, int edad, String departamento) {
        super(nombre, edad);
        this.departamento = departamento;
    }

    @Override
    public void saludar() {
        System.out.println("Hola, soy el director " + nombre + ", tengo " + edad + " años y estoy a cargo del departamento de " + departamento + ".");
    }

    public void dirigir() {
        System.out.println(nombre + " está dirigiendo el departamento de " + departamento + ".");
    }
}
