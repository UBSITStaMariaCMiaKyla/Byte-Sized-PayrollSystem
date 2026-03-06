-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema bytesized_payroll_system
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema bytesized_payroll_system
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `bytesized_payroll_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `bytesized_payroll_system` ;

-- -----------------------------------------------------
-- Table `bytesized_payroll_system`.`department`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bytesized_payroll_system`.`department` ;

CREATE TABLE IF NOT EXISTS `bytesized_payroll_system`.`department` (
  `Department_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NULL DEFAULT NULL,
  PRIMARY KEY (`Department_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `bytesized_payroll_system`.`employees`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bytesized_payroll_system`.`employees` ;

CREATE TABLE IF NOT EXISTS `bytesized_payroll_system`.`employees` (
  `Employee_id` INT NOT NULL AUTO_INCREMENT,
  `Department_id` INT NOT NULL,
  `last_name` VARCHAR(50) CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_unicode_ci' NOT NULL,
  `first_name` VARCHAR(50) CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_unicode_ci' NOT NULL,
  `middle_name` VARCHAR(50) CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_unicode_ci' NULL DEFAULT NULL,
  `gender` VARCHAR(10) NULL DEFAULT NULL,
  `email` VARCHAR(50) NULL DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`Employee_id`),
  UNIQUE INDEX `email` (`email` ASC) VISIBLE,
  INDEX `idx_employees_department` (`Department_id` ASC) VISIBLE,
  CONSTRAINT `fk_employees_department`
    FOREIGN KEY (`Department_id`)
    REFERENCES `bytesized_payroll_system`.`department` (`Department_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `bytesized_payroll_system`.`attendance`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bytesized_payroll_system`.`attendance` ;

CREATE TABLE IF NOT EXISTS `bytesized_payroll_system`.`attendance` (
  `Attendance_id` INT NOT NULL,
  `Employee_id` INT NULL DEFAULT NULL,
  `date` DATE NULL DEFAULT NULL,
  `time_in` TIME NULL DEFAULT NULL,
  `time_out` TIME NULL DEFAULT NULL,
  `hours_worked` DECIMAL(5,2) NULL DEFAULT NULL,
  PRIMARY KEY (`Attendance_id`),
  INDEX `Employee_id` (`Employee_id` ASC) VISIBLE,
  CONSTRAINT `attendance_ibfk_1`
    FOREIGN KEY (`Employee_id`)
    REFERENCES `bytesized_payroll_system`.`employees` (`Employee_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `bytesized_payroll_system`.`employee_salary`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bytesized_payroll_system`.`employee_salary` ;

CREATE TABLE IF NOT EXISTS `bytesized_payroll_system`.`employee_salary` (
  `Salary_id` INT NOT NULL AUTO_INCREMENT,
  `Employee_id` INT NOT NULL,
  `monthly_salary` DECIMAL(12,2) NOT NULL,
  `effective_date` DATE NOT NULL,
  PRIMARY KEY (`Salary_id`),
  UNIQUE INDEX `uq_salary_emp_effective` (`Employee_id` ASC, `effective_date` ASC) VISIBLE,
  INDEX `idx_salary_employee` (`Employee_id` ASC) VISIBLE,
  CONSTRAINT `fk_salary_employee`
    FOREIGN KEY (`Employee_id`)
    REFERENCES `bytesized_payroll_system`.`employees` (`Employee_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `bytesized_payroll_system`.`payroll`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bytesized_payroll_system`.`payroll` ;

CREATE TABLE IF NOT EXISTS `bytesized_payroll_system`.`payroll` (
  `Payroll_id` INT NOT NULL AUTO_INCREMENT,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `payroll_date` DATE NOT NULL,
  PRIMARY KEY (`Payroll_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `bytesized_payroll_system`.`payslip`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `bytesized_payroll_system`.`payslip` ;

CREATE TABLE IF NOT EXISTS `bytesized_payroll_system`.`payslip` (
  `Payslip_id` INT NOT NULL AUTO_INCREMENT,
  `Payroll_id` INT NOT NULL,
  `Employee_id` INT NOT NULL,
  `gross_pay` DECIMAL(12,2) NOT NULL DEFAULT '0.00',
  `total_deductions` DECIMAL(12,2) NOT NULL DEFAULT '0.00',
  `net_pay` DECIMAL(12,2) GENERATED ALWAYS AS ((`gross_pay` - `total_deductions`)) STORED,
  `hours_worked` DECIMAL(5,2) NULL DEFAULT NULL,
  `overtime_hours` DECIMAL(5,2) NULL DEFAULT NULL,
  `overtime_pay` DECIMAL(12,2) NULL DEFAULT NULL,
  `tax_deduction` DECIMAL(12,2) NULL DEFAULT NULL,
  `sss_deduction` DECIMAL(12,2) NULL DEFAULT NULL,
  `philhealth_deduction` DECIMAL(12,2) NULL DEFAULT NULL,
  `pagibig_deduction` DECIMAL(12,2) NULL DEFAULT NULL,
  PRIMARY KEY (`Payslip_id`),
  UNIQUE INDEX `uq_payslip_one_per_period` (`Payroll_id` ASC, `Employee_id` ASC) VISIBLE,
  INDEX `idx_payslip_employee` (`Employee_id` ASC) VISIBLE,
  CONSTRAINT `fk_payslip_employee`
    FOREIGN KEY (`Employee_id`)
    REFERENCES `bytesized_payroll_system`.`employees` (`Employee_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_payslip_payroll`
    FOREIGN KEY (`Payroll_id`)
    REFERENCES `bytesized_payroll_system`.`payroll` (`Payroll_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
