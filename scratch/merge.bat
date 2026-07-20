@echo off
echo Creating database db_slik_map_mci if it does not exist...
C:\xampp\mysql\bin\mysql.exe -P 33006 -u root -pXurang1234!! -e "CREATE DATABASE IF NOT EXISTS db_slik_map_mci;"

echo Importing db_wablast_backup.sql into db_slik_map_mci...
C:\xampp\mysql\bin\mysql.exe -P 33006 -u root -pXurang1234!! db_slik_map_mci < C:\Users\server\db_wablast_backup.sql

echo Importing grahadi_mci_backup.sql into db_slik_map_mci...
C:\xampp\mysql\bin\mysql.exe -P 33006 -u root -pXurang1234!! db_slik_map_mci < C:\Users\server\grahadi_mci_backup.sql

echo Database Merge Completed Successfully!
