#!/bin/bash
echo "Encendiendo base de datos MySQL..."
sudo systemctl start mysqld

echo "Iniciando servidor del Cotizador..."
node server.js

echo "Apagando base de datos MySQL..."
sudo systemctl stop mysqld
echo "¡Memoria liberada!"
