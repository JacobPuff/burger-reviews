#!/bin/bash

ssh -i ${KEY_PATH} -oStrictHostKeyChecking=no ${SERVER_USER}@${SERVER_ADDRESS} '
cd /home/ubuntu/burger-reviews
git pull
sudo docker-compose stop
sudo docker-compose up --build -d
'