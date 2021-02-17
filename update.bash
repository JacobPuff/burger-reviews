#!/bin/bash

ssh -i ${KEY_PATH} -oStrictHostKeyChecking=no ${SERVER_USER}@${SERVER_ADDRESS} '
cd /home/ubuntu/burger-reviews
git pull
docker stop burger-reviews_burger-reviews_1
docker stop burger-reviews_burger-reviews-redis_1
docker-compose up -d
'