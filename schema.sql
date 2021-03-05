-- phpMyAdmin SQL Dump
-- version 5.0.4
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 05, 2021 at 11:31 AM
-- Server version: 10.3.25-MariaDB-0ubuntu0.20.04.1
-- PHP Version: 7.4.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `spotify_info`
--
CREATE DATABASE IF NOT EXISTS `spotify_info` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `spotify_info`;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
CREATE TABLE `User` (
  `id` varchar(255) NOT NULL COMMENT 'User ID provided by Spotify',
  `auth` varchar(40) DEFAULT NULL COMMENT 'Auth key for logging in via query parameter',
  `scope` text DEFAULT NULL COMMENT 'Spotify access token scopes',
  `access` varchar(255) NOT NULL COMMENT 'Spotify access (bearer) token',
  `refresh` varchar(255) NOT NULL COMMENT 'Spotify refresh token',
  `issued` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Time of access token issue',
  `expiry` int(11) NOT NULL COMMENT 'Access token validity period',
  `background_colour` char(6) NOT NULL DEFAULT '505050' COMMENT 'Background colour for widget',
  `text_colour` char(6) NOT NULL DEFAULT 'ffffff' COMMENT 'Text colour for widget',
  `settings_updated` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Widget settings last updated'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `User`
--
ALTER TABLE `User`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth` (`auth`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
