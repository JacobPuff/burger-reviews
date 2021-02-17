#!/bin/bash

ssh -i ${KEY_PATH} -oStrictHostKeyChecking=no ${SERVER_USER}@${SERVER_ADDRESS} '
cd /home/ubuntu/burger-reviews
git pull
sudo docker stop burgerreviews_burger-reviews_1
sudo docker stop burgerreviews_burger-reviews-redis_1
sudo docker-compose up --build -d
'