#!/bin/bash

ssh -i ${KEY_PATH} -oStrictHostKeyChecking=no ${SERVER_USER}@${SERVER_ADDRESS} '
cd /home/ubuntu/burger-reviews
git pull
sudo docker-compose --env-file ./.env.prod up --build -d
'